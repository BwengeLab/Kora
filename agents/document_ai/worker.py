from __future__ import annotations

from threading import Event, Thread

from agents.document_ai.enterprise_engine import EnterpriseDocumentEngine, ExtractionPolicy
from agents.document_ai.jobs import JobRepository
from agents.document_ai.object_store import DocumentObjectStore
from agents.document_ai.schemas import ExtractionContext


class ExtractionWorker:
    def __init__(
        self,
        repository: JobRepository,
        object_store: DocumentObjectStore,
        engine: EnterpriseDocumentEngine,
        max_file_bytes: int = 100 * 1024 * 1024,
        heartbeat_seconds: int = 60,
    ) -> None:
        if heartbeat_seconds < 1:
            raise ValueError("heartbeat interval must be positive")
        self.repository = repository
        self.object_store = object_store
        self.engine = engine
        self.max_file_bytes = max_file_bytes
        self.heartbeat_seconds = heartbeat_seconds

    def run_once(self) -> bool:
        job = self.repository.claim_next()
        if job is None:
            return False
        stop_heartbeat = Event()
        heartbeat_errors: list[Exception] = []

        def heartbeat() -> None:
            while not stop_heartbeat.wait(self.heartbeat_seconds):
                try:
                    self.repository.renew_lease(job)
                except Exception as exc:
                    heartbeat_errors.append(exc)
                    return

        heartbeat_thread = Thread(target=heartbeat, daemon=True)
        heartbeat_thread.start()
        try:
            content = self.object_store.read_verified(
                job.object_key, job.document_fingerprint, self.max_file_bytes
            )
            result = self.engine.process(
                content,
                ExtractionContext(
                    organization_id=job.organization_id,
                    source_document_id=job.document_id,
                    ingestion_batch_id=job.ingestion_batch_id,
                    extraction_version_id=job.extraction_version_id,
                    file_name=job.file_name,
                    content_type=job.content_type,
                ),
                ExtractionPolicy(
                    preferred_provider=job.preferred_provider,
                    external_provider_allowed=job.external_provider_allowed,
                    ocr_language=job.ocr_language,
                ),
            )
            if heartbeat_errors:
                raise RuntimeError(f"worker lease renewal failed: {heartbeat_errors[0]}")
            self.repository.complete(job, result)
        except Exception as exc:
            try:
                self.repository.fail(job, f"{type(exc).__name__}: {exc}")
            except ValueError:
                pass
        finally:
            stop_heartbeat.set()
            heartbeat_thread.join(timeout=max(self.heartbeat_seconds, 1))
        return True
