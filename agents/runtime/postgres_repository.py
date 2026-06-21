from __future__ import annotations

from dataclasses import asdict
import json
from typing import Any
from uuid import uuid4

from agents.evaluation.evaluator import EvaluationResult, FeedbackRecord
from agents.runtime.runtime import RunRecord
from agents.shared.schemas import AgentOutput, Confidence, Evidence, Money


class PostgresAgentRepository:
    def __init__(self, database_url: str) -> None:
        if not database_url:
            raise ValueError("database_url is required")
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as exc:
            raise RuntimeError("psycopg is required for PostgreSQL agent persistence") from exc
        self._database_url = database_url
        self._psycopg = psycopg
        self._row_factory = dict_row

    def find_by_idempotency(
        self, organization_id: str, idempotency_key: str
    ) -> RunRecord | None:
        return self._find(
            "organization_id = %s AND idempotency_key = %s",
            (organization_id, idempotency_key),
        )

    def get_run(self, organization_id: str, run_id: str) -> RunRecord | None:
        return self._find(
            "organization_id = %s AND id = %s", (organization_id, run_id)
        )

    def save_run(self, record: RunRecord) -> RunRecord:
        output = asdict(record.output)
        with self._connect() as connection:
            inserted = connection.execute(
                """
                INSERT INTO agent_runs(
                    id, organization_id, user_id, idempotency_key,
                    request_fingerprint, agent_name, output_type, objective,
                    model_route, external_model, redacted_fields, output,
                    refused, refusal_reason, workflow_task_id, match_candidate_id,
                    created_at
                ) VALUES(
                    %(id)s, %(organization_id)s, %(user_id)s, %(idempotency_key)s,
                    %(request_fingerprint)s, %(agent_name)s, %(output_type)s,
                    %(objective)s, %(model_route)s, %(external_model)s,
                    %(redacted_fields)s::jsonb, %(output)s::jsonb, %(refused)s,
                    %(refusal_reason)s, %(workflow_task_id)s, %(match_candidate_id)s,
                    %(created_at)s
                )
                ON CONFLICT(organization_id, idempotency_key) DO NOTHING
                RETURNING id
                """,
                {
                    "id": record.run_id,
                    "organization_id": record.organization_id,
                    "user_id": record.user_id,
                    "idempotency_key": record.idempotency_key,
                    "request_fingerprint": record.request_fingerprint,
                    "agent_name": record.agent_name,
                    "output_type": record.output.output_type,
                    "objective": record.objective,
                    "model_route": record.model_route,
                    "external_model": record.external_model,
                    "redacted_fields": json.dumps(record.redacted_fields),
                    "output": json.dumps(output),
                    "refused": record.output.refused,
                    "refusal_reason": record.output.refusal_reason,
                    "workflow_task_id": record.output.workflow_task_id or None,
                    "match_candidate_id": record.output.candidate_id or None,
                    "created_at": record.created_at,
                },
            ).fetchone()
            if not inserted:
                existing_row = connection.execute(
                    self._select_sql(
                        "organization_id = %s AND idempotency_key = %s"
                    ),
                    (record.organization_id, record.idempotency_key),
                ).fetchone()
                existing = self._decode_record(existing_row)
                if existing.request_fingerprint != record.request_fingerprint:
                    raise ValueError(
                        "idempotency key was reused with a different request"
                    )
                return existing
            for item in record.output.evidence:
                connection.execute(
                    """
                    INSERT INTO agent_run_evidence(
                        id, organization_id, agent_run_id, source_document_id,
                        source_record_id, evidence
                    ) VALUES(%s, %s, %s, %s, %s, %s::jsonb)
                    """,
                    (
                        f"agent_evidence_{uuid4().hex}",
                        record.organization_id,
                        record.run_id,
                        item.source_document_id,
                        item.source_record_id,
                        json.dumps(asdict(item)),
                    ),
                )
        return record

    def save_feedback(self, record: FeedbackRecord) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO agent_feedback(
                    id, organization_id, agent_run_id, reviewer_user_id,
                    label, comment, created_at
                ) VALUES(%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    record.feedback_id,
                    record.organization_id,
                    record.run_id,
                    record.reviewer_user_id,
                    record.label,
                    record.comment,
                    record.created_at,
                ),
            )

    def save_evaluation(
        self,
        organization_id: str,
        run_id: str,
        dataset_id: str,
        result: EvaluationResult,
    ) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO agent_evaluation_results(
                    id, organization_id, agent_run_id, dataset_id, case_id,
                    expected_action, actual_action, action_matches,
                    evidence_grounded, hallucination_detected, refusal_correct,
                    confidence_error, confidence_calibrated, passed
                ) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT(agent_run_id, dataset_id, case_id) DO NOTHING
                """,
                (
                    f"agent_eval_{uuid4().hex}",
                    organization_id,
                    run_id,
                    dataset_id,
                    result.case_id,
                    result.expected_action,
                    result.actual_action,
                    result.action_matches,
                    result.evidence_grounded,
                    result.hallucination_detected,
                    result.refusal_correct,
                    result.confidence_error,
                    result.confidence_calibrated,
                    result.passed,
                ),
            )

    def _find(self, where: str, parameters: tuple[str, str]) -> RunRecord | None:
        with self._connect() as connection:
            row = connection.execute(self._select_sql(where), parameters).fetchone()
        return self._decode_record(row) if row else None

    def _connect(self) -> Any:
        return self._psycopg.connect(
            self._database_url, row_factory=self._row_factory
        )

    @staticmethod
    def _select_sql(where: str) -> str:
        return f"""
            SELECT id, organization_id, user_id, idempotency_key,
                   request_fingerprint, agent_name, objective, model_route,
                   external_model, redacted_fields, output, created_at
            FROM agent_runs WHERE {where}
        """

    @staticmethod
    def _decode_record(row: dict[str, Any]) -> RunRecord:
        output_data = dict(row["output"])
        output_data["confidence"] = Confidence(**output_data["confidence"])
        output_data["evidence"] = [
            PostgresAgentRepository._decode_evidence(item)
            for item in output_data["evidence"]
        ]
        output = AgentOutput(**output_data)
        output.validate()
        created_at = row["created_at"]
        return RunRecord(
            run_id=row["id"],
            organization_id=row["organization_id"],
            user_id=row["user_id"],
            agent_name=row["agent_name"],
            objective=row["objective"],
            idempotency_key=row["idempotency_key"],
            request_fingerprint=row["request_fingerprint"],
            model_route=row["model_route"],
            external_model=row["external_model"],
            redacted_fields=tuple(row["redacted_fields"]),
            output=output,
            created_at=(
                created_at.isoformat()
                if hasattr(created_at, "isoformat")
                else str(created_at)
            ),
        )

    @staticmethod
    def _decode_evidence(data: dict[str, Any]) -> Evidence:
        item = dict(data)
        item["confidence"] = Confidence(**item["confidence"])
        if item.get("amount"):
            item["amount"] = Money(**item["amount"])
        return Evidence(**item)
