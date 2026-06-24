from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
import json
from typing import Any
from uuid import uuid4

from agents.document_ai.enterprise_schemas import EnterpriseExtractionResult
from agents.document_ai.jobs import ExtractionJob


class PostgresJobRepository:
    def __init__(
        self,
        database_url: str,
        worker_id: str = "document-ai-worker",
        lease_seconds: int = 300,
    ) -> None:
        if not worker_id or lease_seconds < 1:
            raise ValueError("worker identity and positive lease are required")
        import psycopg
        from psycopg.rows import dict_row

        self.database_url = database_url
        self.psycopg = psycopg
        self.row_factory = dict_row
        self.worker_id = worker_id
        self.lease_seconds = lease_seconds

    def submit(self, job: ExtractionJob) -> ExtractionJob:
        job.validate()
        with self._connect() as connection:
            inserted = connection.execute(
                """
                INSERT INTO document_extraction_jobs(
                    id, organization_id, document_id, ingestion_batch_id, extraction_version_id,
                    idempotency_key, document_fingerprint, object_key, file_name,
                    content_type, preferred_provider, external_provider_allowed,
                    ocr_language, state, attempt_count, max_attempts, last_error,
                    created_at, updated_at
                ) VALUES(
                    %(id)s, %(organization_id)s, %(document_id)s, %(ingestion_batch_id)s,
                    %(extraction_version_id)s, %(idempotency_key)s,
                    %(document_fingerprint)s, %(object_key)s, %(file_name)s,
                    %(content_type)s, %(preferred_provider)s,
                    %(external_provider_allowed)s, %(ocr_language)s, %(state)s,
                    %(attempt_count)s, %(max_attempts)s, %(last_error)s,
                    %(created_at)s, %(updated_at)s
                )
                ON CONFLICT(organization_id, idempotency_key) DO NOTHING
                RETURNING *
                """,
                asdict(job),
            ).fetchone()
            if not inserted:
                existing = connection.execute(
                    "SELECT * FROM document_extraction_jobs WHERE organization_id=%s AND idempotency_key=%s",
                    (job.organization_id, job.idempotency_key),
                ).fetchone()
                decoded = self._decode(existing)
                if decoded.document_fingerprint != job.document_fingerprint:
                    raise ValueError("idempotency key reused for another document")
                return decoded
            self._event(connection, job, "", "QUEUED", "job submitted")
            return self._decode(inserted)

    def get(self, organization_id: str, job_id: str) -> ExtractionJob:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM document_extraction_jobs WHERE organization_id=%s AND id=%s",
                (organization_id, job_id),
            ).fetchone()
        if not row:
            raise ValueError("extraction job not found")
        return self._decode(row)

    def claim_next(self) -> ExtractionJob | None:
        with self._connect() as connection:
            claim_token = f"{self.worker_id}:{uuid4().hex}"
            stale_rows = connection.execute(
                """
                UPDATE document_extraction_jobs
                SET state='RETRY', claimed_by='', lease_expires_at=NULL,
                    last_error='worker lease expired', available_at=now(), updated_at=now()
                WHERE state='PROCESSING' AND lease_expires_at < now()
                RETURNING *
                """
            ).fetchall()
            for stale_row in stale_rows:
                stale_job = self._decode(stale_row)
                self._event(
                    connection,
                    stale_job,
                    "PROCESSING",
                    "RETRY",
                    "worker lease expired",
                )
            row = connection.execute(
                """
                WITH candidate AS (
                    SELECT id FROM document_extraction_jobs
                    WHERE state IN('QUEUED','RETRY') AND available_at <= now()
                    ORDER BY available_at, created_at, id
                    FOR UPDATE SKIP LOCKED LIMIT 1
                )
                UPDATE document_extraction_jobs jobs
                SET state='PROCESSING', attempt_count=attempt_count+1,
                    updated_at=now(), last_error='', claimed_by=%s,
                    lease_expires_at=now() + make_interval(secs => %s)
                FROM candidate WHERE jobs.id=candidate.id
                RETURNING jobs.*
                """,
                (claim_token, self.lease_seconds),
            ).fetchone()
            if not row:
                return None
            job = self._decode(row)
            from_state = "QUEUED" if job.attempt_count == 1 else "RETRY"
            self._event(connection, job, from_state, "PROCESSING", "worker claimed job")
            return job

    def renew_lease(self, job: ExtractionJob) -> ExtractionJob:
        with self._connect() as connection:
            row = connection.execute(
                """
                UPDATE document_extraction_jobs
                SET lease_expires_at=now() + make_interval(secs => %s), updated_at=now()
                WHERE id=%s AND organization_id=%s AND state='PROCESSING'
                  AND claimed_by=%s
                RETURNING *
                """,
                (
                    self.lease_seconds,
                    job.id,
                    job.organization_id,
                    job.claimed_by,
                ),
            ).fetchone()
        if not row:
            raise ValueError("extraction job lease is no longer owned by this worker")
        return self._decode(row)

    def complete(
        self, job: ExtractionJob, result: EnterpriseExtractionResult
    ) -> ExtractionJob:
        result.validate()
        target = "NEEDS_REVIEW" if result.requires_human_review else "COMPLETED"
        result_id = f"extraction_result_{uuid4().hex}"
        payload = result.to_dict()
        with self._connect() as connection:
            row = connection.execute(
                """
                UPDATE document_extraction_jobs
                SET state=%s, updated_at=now(), last_error='',
                    claimed_by='', lease_expires_at=NULL
                WHERE id=%s AND organization_id=%s AND state='PROCESSING'
                  AND claimed_by=%s
                RETURNING *
                """,
                (target, job.id, job.organization_id, job.claimed_by),
            ).fetchone()
            if not row:
                raise ValueError("extraction job is not processing")
            connection.execute(
                """
                INSERT INTO document_extraction_results(
                    id, organization_id, job_id, provider_name, provider_version,
                    schema_version, requires_human_review, inspection, result
                ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb)
                """,
                (
                    result_id,
                    job.organization_id,
                    job.id,
                    result.provider_name,
                    result.provider_version,
                    result.metadata.get("schema_version", "document-intelligence.v2"),
                    result.requires_human_review,
                    json.dumps(asdict(result.inspection)),
                    json.dumps(payload),
                ),
            )
            if result.raw_content:
                for page in result.raw_content.pages:
                    token_scores = [
                        token.confidence for line in page.lines for token in line.tokens
                    ]
                    scored_confidence = (
                        None
                        if "unscored" in result.raw_content.extraction_method
                        else sum(token_scores) / len(token_scores)
                        if token_scores
                        else None
                    )
                    connection.execute(
                        """
                        INSERT INTO document_page_artifacts(
                            id, organization_id, extraction_result_id, page_number,
                            width, height, ocr_method, ocr_confidence
                        ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            f"page_artifact_{uuid4().hex}",
                            job.organization_id,
                            result_id,
                            page.page_number,
                            page.width,
                            page.height,
                            result.raw_content.extraction_method,
                            scored_confidence,
                        ),
                    )
            for lineage in result.field_lineage:
                connection.execute(
                    """
                    INSERT INTO extracted_field_lineage(
                        id, organization_id, extraction_result_id, source_record_id,
                        field_name, raw_text, normalized_value, confidence, calibrated,
                        extraction_method, model_name, model_version, page_number,
                        bounding_box, validation_codes
                    ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s)
                    """,
                    (
                        f"field_lineage_{uuid4().hex}",
                        job.organization_id,
                        result_id,
                        lineage.source_record_id,
                        lineage.field_name,
                        lineage.raw_text,
                        lineage.normalized_value,
                        lineage.confidence,
                        lineage.calibrated,
                        lineage.extraction_method,
                        lineage.model_name,
                        lineage.model_version,
                        lineage.bounding_box.page_number if lineage.bounding_box else 0,
                        json.dumps(asdict(lineage.bounding_box)) if lineage.bounding_box else None,
                        list(lineage.validation_codes),
                    ),
                )
            for issue in result.validation_issues:
                connection.execute(
                    """
                    INSERT INTO document_validation_issues(
                        id, organization_id, extraction_result_id, code, severity,
                        message, field_name
                    ) VALUES(%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        f"validation_issue_{uuid4().hex}",
                        job.organization_id,
                        result_id,
                        issue.code,
                        issue.severity,
                        issue.message,
                        issue.field_name,
                    ),
                )
            completed = self._decode(row)
            self._event(connection, completed, "PROCESSING", target, "extraction completed")
            return completed

    def fail(self, job: ExtractionJob, error: str) -> ExtractionJob:
        target = "RETRY" if job.attempt_count < job.max_attempts else "DEAD_LETTER"
        with self._connect() as connection:
            row = connection.execute(
                """
                UPDATE document_extraction_jobs
                SET state=%s, last_error=%s, updated_at=now(), claimed_by='',
                    lease_expires_at=NULL,
                    available_at=CASE WHEN %s='RETRY' THEN now() + make_interval(
                        secs => LEAST(900, 30 * power(2, GREATEST(attempt_count - 1, 0))::int)
                    ) ELSE available_at END
                WHERE id=%s AND organization_id=%s AND state='PROCESSING'
                  AND claimed_by=%s
                RETURNING *
                """,
                (
                    target,
                    error[:2000],
                    target,
                    job.id,
                    job.organization_id,
                    job.claimed_by,
                ),
            ).fetchone()
            if not row:
                raise ValueError("extraction job is not processing")
            failed = self._decode(row)
            self._event(connection, failed, "PROCESSING", target, error[:500])
            return failed

    def _connect(self) -> Any:
        return self.psycopg.connect(self.database_url, row_factory=self.row_factory)

    @staticmethod
    def _event(
        connection: Any,
        job: ExtractionJob,
        from_state: str,
        to_state: str,
        reason: str,
    ) -> None:
        connection.execute(
            """
            INSERT INTO document_extraction_job_events(
                id, organization_id, job_id, from_state, to_state, reason
            ) VALUES(%s,%s,%s,%s,%s,%s)
            """,
            (
                f"extraction_event_{uuid4().hex}",
                job.organization_id,
                job.id,
                from_state,
                to_state,
                reason,
            ),
        )

    @staticmethod
    def _decode(row: dict[str, Any]) -> ExtractionJob:
        def timestamp(value: Any) -> str:
            return value.isoformat() if isinstance(value, datetime) else str(value)

        return ExtractionJob(
            id=row["id"],
            organization_id=row["organization_id"],
            document_id=row["document_id"],
            ingestion_batch_id=row["ingestion_batch_id"],
            extraction_version_id=row["extraction_version_id"],
            idempotency_key=row["idempotency_key"],
            document_fingerprint=row["document_fingerprint"],
            object_key=row["object_key"],
            file_name=row["file_name"],
            content_type=row["content_type"],
            preferred_provider=row["preferred_provider"],
            external_provider_allowed=row["external_provider_allowed"],
            ocr_language=row["ocr_language"],
            state=row["state"],
            attempt_count=row["attempt_count"],
            max_attempts=row["max_attempts"],
            last_error=row["last_error"],
            claimed_by=row.get("claimed_by", ""),
            lease_expires_at=(
                timestamp(row["lease_expires_at"])
                if row.get("lease_expires_at")
                else ""
            ),
            created_at=timestamp(row["created_at"]),
            updated_at=timestamp(row["updated_at"]),
        )
