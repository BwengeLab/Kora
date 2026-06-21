from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Protocol
from uuid import uuid4

from agents.shared.schemas import AgentOutput


FEEDBACK_LABELS = {"correct", "incorrect", "risky", "unclear"}


@dataclass(frozen=True)
class EvaluationCase:
    case_id: str
    agent_name: str
    expected_action: str
    expected_confidence: float
    expected_evidence_record_ids: tuple[str, ...]
    expect_refusal: bool = False
    confidence_tolerance: float = 0.10


@dataclass(frozen=True)
class EvaluationResult:
    case_id: str
    agent_name: str
    expected_action: str
    actual_action: str
    action_matches: bool
    evidence_grounded: bool
    hallucination_detected: bool
    refusal_correct: bool
    confidence_error: float
    confidence_calibrated: bool
    passed: bool


@dataclass(frozen=True)
class FeedbackRecord:
    feedback_id: str
    organization_id: str
    run_id: str
    reviewer_user_id: str
    label: str
    comment: str
    created_at: str


class EvaluationRepository(Protocol):
    def save_feedback(self, record: FeedbackRecord) -> None: ...

    def save_evaluation(
        self,
        organization_id: str,
        run_id: str,
        dataset_id: str,
        result: EvaluationResult,
    ) -> None: ...


class FeedbackStore:
    def __init__(self, repository: EvaluationRepository | None = None) -> None:
        self._records: list[FeedbackRecord] = []
        self._lock = RLock()
        self._repository = repository

    def add(
        self,
        organization_id: str,
        run_id: str,
        reviewer_user_id: str,
        label: str,
        comment: str,
    ) -> FeedbackRecord:
        if not organization_id or not run_id or not reviewer_user_id:
            raise ValueError("organization, run, and reviewer are required")
        if label not in FEEDBACK_LABELS:
            raise ValueError("feedback label is invalid")
        record = FeedbackRecord(
            feedback_id=f"feedback_{uuid4().hex}",
            organization_id=organization_id,
            run_id=run_id,
            reviewer_user_id=reviewer_user_id,
            label=label,
            comment=comment,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        with self._lock:
            if self._repository:
                self._repository.save_feedback(record)
            self._records.append(record)
        return record

    def list_for_run(self, organization_id: str, run_id: str) -> list[FeedbackRecord]:
        with self._lock:
            return [
                record
                for record in self._records
                if record.organization_id == organization_id and record.run_id == run_id
            ]


def evaluate_output(output: AgentOutput, case: EvaluationCase) -> EvaluationResult:
    output.validate()
    if output.agent_name != case.agent_name:
        raise ValueError("evaluation case targets another agent")
    actual_records = {item.source_record_id for item in output.evidence}
    expected_records = set(case.expected_evidence_record_ids)
    evidence_grounded = actual_records.issubset(expected_records) and (
        bool(actual_records) or case.expect_refusal
    )
    action_matches = output.action == case.expected_action
    refusal_correct = output.refused == case.expect_refusal
    confidence_error = abs(output.confidence.score - case.expected_confidence)
    confidence_calibrated = confidence_error <= case.confidence_tolerance
    hallucination = not evidence_grounded or (
        not case.expect_refusal and output.refused
    )
    passed = all(
        (
            action_matches,
            evidence_grounded,
            refusal_correct,
            confidence_calibrated,
            not hallucination,
        )
    )
    return EvaluationResult(
        case_id=case.case_id,
        agent_name=output.agent_name,
        expected_action=case.expected_action,
        actual_action=output.action,
        action_matches=action_matches,
        evidence_grounded=evidence_grounded,
        hallucination_detected=hallucination,
        refusal_correct=refusal_correct,
        confidence_error=confidence_error,
        confidence_calibrated=confidence_calibrated,
        passed=passed,
    )


def load_cases(path: str | Path) -> list[EvaluationCase]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return [
        EvaluationCase(
            case_id=item["case_id"],
            agent_name=item["agent_name"],
            expected_action=item["expected_action"],
            expected_confidence=float(item["expected_confidence"]),
            expected_evidence_record_ids=tuple(
                item.get("expected_evidence_record_ids", [])
            ),
            expect_refusal=bool(item.get("expect_refusal", False)),
            confidence_tolerance=float(item.get("confidence_tolerance", 0.10)),
        )
        for item in payload["cases"]
    ]
