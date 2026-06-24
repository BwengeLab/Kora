from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Protocol
from uuid import uuid4
import re

from agents.document_ai.enterprise_schemas import EnterpriseExtractionResult


JOB_STATES = {
    "QUEUED",
    "PROCESSING",
    "RETRY",
    "NEEDS_REVIEW",
    "COMPLETED",
    "FAILED",
    "DEAD_LETTER",
}


@dataclass(frozen=True)
class ExtractionJob:
    id: str
    organization_id: str
    document_id: str
    ingestion_batch_id: str
    extraction_version_id: str
    idempotency_key: str
    document_fingerprint: str
    object_key: str
    file_name: str
    content_type: str
    preferred_provider: str = ""
    external_provider_allowed: bool = False
    ocr_language: str = "eng"
    state: str = "QUEUED"
    attempt_count: int = 0
    max_attempts: int = 3
    last_error: str = ""
    claimed_by: str = ""
    lease_expires_at: str = ""
    created_at: str = ""
    updated_at: str = ""

    def validate(self) -> None:
        required = (
            self.id,
            self.organization_id,
            self.document_id,
            self.ingestion_batch_id,
            self.extraction_version_id,
            self.idempotency_key,
            self.document_fingerprint,
            self.object_key,
            self.file_name,
        )
        if not all(required):
            raise ValueError("extraction job identity and source are required")
        if self.state not in JOB_STATES:
            raise ValueError("extraction job state is invalid")
        if self.attempt_count < 0 or self.max_attempts < 1:
            raise ValueError("extraction job attempt counts are invalid")
        if not re.fullmatch(r"[0-9a-f]{64}", self.document_fingerprint):
            raise ValueError("document fingerprint must be lowercase sha256")
        if not self.object_key.startswith(f"{self.organization_id}/"):
            raise ValueError("document object key must be tenant scoped")
        if "\\" in self.object_key or any(
            segment in {"", ".", ".."} for segment in self.object_key.split("/")
        ):
            raise ValueError("document object key is not normalized")
        if any(ord(character) < 32 for character in self.object_key):
            raise ValueError("document object key contains control characters")


@dataclass(frozen=True)
class JobEvent:
    id: str
    job_id: str
    organization_id: str
    from_state: str
    to_state: str
    reason: str
    occurred_at: str


class JobRepository(Protocol):
    def submit(self, job: ExtractionJob) -> ExtractionJob: ...

    def get(self, organization_id: str, job_id: str) -> ExtractionJob: ...

    def claim_next(self) -> ExtractionJob | None: ...

    def renew_lease(self, job: ExtractionJob) -> ExtractionJob: ...

    def complete(self, job: ExtractionJob, result: EnterpriseExtractionResult) -> ExtractionJob: ...

    def fail(self, job: ExtractionJob, error: str) -> ExtractionJob: ...


class MemoryJobRepository:
    def __init__(self, worker_id: str = "memory-worker", lease_seconds: int = 300) -> None:
        if not worker_id or lease_seconds < 1:
            raise ValueError("worker identity and positive lease are required")
        self._jobs: dict[str, ExtractionJob] = {}
        self._idempotency: dict[tuple[str, str], str] = {}
        self._events: dict[str, list[JobEvent]] = {}
        self._results: dict[str, EnterpriseExtractionResult] = {}
        self._lock = RLock()
        self.worker_id = worker_id
        self.lease_seconds = lease_seconds

    def submit(self, job: ExtractionJob) -> ExtractionJob:
        job.validate()
        key = (job.organization_id, job.idempotency_key)
        with self._lock:
            existing_id = self._idempotency.get(key)
            if existing_id:
                existing = self._jobs[existing_id]
                if existing.document_fingerprint != job.document_fingerprint:
                    raise ValueError("idempotency key reused for another document")
                return existing
            self._jobs[job.id] = job
            self._idempotency[key] = job.id
            self._append_event(job, "", "QUEUED", "job submitted")
        return job

    def get(self, organization_id: str, job_id: str) -> ExtractionJob:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None or job.organization_id != organization_id:
            raise ValueError("extraction job not found")
        return job

    def claim_next(self) -> ExtractionJob | None:
        with self._lock:
            now = datetime.now(timezone.utc)
            for stale in list(self._jobs.values()):
                if (
                    stale.state == "PROCESSING"
                    and stale.lease_expires_at
                    and datetime.fromisoformat(stale.lease_expires_at) <= now
                ):
                    recovered = replace(
                        stale,
                        state="RETRY",
                        claimed_by="",
                        lease_expires_at="",
                        last_error="worker lease expired",
                        updated_at=now.isoformat(),
                    )
                    self._jobs[stale.id] = recovered
                    self._append_event(
                        recovered, "PROCESSING", "RETRY", "worker lease expired"
                    )
            candidates = [
                job for job in self._jobs.values() if job.state in {"QUEUED", "RETRY"}
            ]
            if not candidates:
                return None
            job = sorted(candidates, key=lambda item: (item.created_at, item.id))[0]
            claimed = replace(
                job,
                state="PROCESSING",
                attempt_count=job.attempt_count + 1,
                claimed_by=f"{self.worker_id}:{uuid4().hex}",
                lease_expires_at=(now + timedelta(seconds=self.lease_seconds)).isoformat(),
                updated_at=_now(),
            )
            self._jobs[job.id] = claimed
            self._append_event(claimed, job.state, "PROCESSING", "worker claimed job")
            return claimed

    def renew_lease(self, job: ExtractionJob) -> ExtractionJob:
        with self._lock:
            current = self._require_processing(job)
            renewed = replace(
                current,
                lease_expires_at=(
                    datetime.now(timezone.utc) + timedelta(seconds=self.lease_seconds)
                ).isoformat(),
                updated_at=_now(),
            )
            self._jobs[job.id] = renewed
            return renewed

    def complete(
        self, job: ExtractionJob, result: EnterpriseExtractionResult
    ) -> ExtractionJob:
        target = "NEEDS_REVIEW" if result.requires_human_review else "COMPLETED"
        with self._lock:
            current = self._require_processing(job)
            completed = replace(
                current,
                state=target,
                updated_at=_now(),
                last_error="",
                claimed_by="",
                lease_expires_at="",
            )
            self._jobs[job.id] = completed
            self._results[job.id] = result
            self._append_event(completed, "PROCESSING", target, "extraction completed")
            return completed

    def fail(self, job: ExtractionJob, error: str) -> ExtractionJob:
        with self._lock:
            current = self._require_processing(job)
            target = "RETRY" if current.attempt_count < current.max_attempts else "DEAD_LETTER"
            failed = replace(
                current,
                state=target,
                updated_at=_now(),
                last_error=error[:2000],
                claimed_by="",
                lease_expires_at="",
            )
            self._jobs[job.id] = failed
            self._append_event(failed, "PROCESSING", target, error[:500])
            return failed

    def result(
        self, organization_id: str, job_id: str
    ) -> EnterpriseExtractionResult | None:
        self.get(organization_id, job_id)
        with self._lock:
            return self._results.get(job_id)

    def events(self, organization_id: str, job_id: str) -> list[JobEvent]:
        self.get(organization_id, job_id)
        with self._lock:
            return list(self._events.get(job_id, []))

    def _require_processing(self, job: ExtractionJob) -> ExtractionJob:
        current = self._jobs.get(job.id)
        if (
            current is None
            or current.state != "PROCESSING"
            or not job.claimed_by
            or current.claimed_by != job.claimed_by
        ):
            raise ValueError("extraction job is not processing")
        return current

    def _append_event(
        self, job: ExtractionJob, from_state: str, to_state: str, reason: str
    ) -> None:
        self._events.setdefault(job.id, []).append(
            JobEvent(
                id=f"extraction_event_{uuid4().hex}",
                job_id=job.id,
                organization_id=job.organization_id,
                from_state=from_state,
                to_state=to_state,
                reason=reason,
                occurred_at=_now(),
            )
        )


def new_job(
    organization_id: str,
    document_id: str,
    ingestion_batch_id: str,
    extraction_version_id: str,
    idempotency_key: str,
    document_fingerprint: str,
    object_key: str,
    file_name: str,
    content_type: str,
    preferred_provider: str = "",
    external_provider_allowed: bool = False,
    ocr_language: str = "eng",
    max_attempts: int = 3,
) -> ExtractionJob:
    now = _now()
    job = ExtractionJob(
        id=f"extraction_job_{uuid4().hex}",
        organization_id=organization_id,
        document_id=document_id,
        ingestion_batch_id=ingestion_batch_id,
        extraction_version_id=extraction_version_id,
        idempotency_key=idempotency_key,
        document_fingerprint=document_fingerprint,
        object_key=object_key,
        file_name=file_name,
        content_type=content_type,
        preferred_provider=preferred_provider,
        external_provider_allowed=external_provider_allowed,
        ocr_language=ocr_language,
        max_attempts=max_attempts,
        created_at=now,
        updated_at=now,
    )
    job.validate()
    return job


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
