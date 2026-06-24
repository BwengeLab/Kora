import hashlib
import unittest
from dataclasses import replace
from datetime import datetime, timedelta, timezone

from agents.document_ai.enterprise_engine import EnterpriseDocumentEngine
from agents.document_ai.jobs import MemoryJobRepository, new_job
from agents.document_ai.object_store import MemoryDocumentObjectStore
from agents.document_ai.worker import ExtractionWorker


class WorkerTests(unittest.TestCase):
    def test_worker_processes_immutable_object_and_records_history(self) -> None:
        content = b"date,reference,amount,currency,type\n2026-01-01,INV-1,1000,RWF,payment\n"
        fingerprint = hashlib.sha256(content).hexdigest()
        repository = MemoryJobRepository()
        job = repository.submit(
            new_job(
                "org-1",
                "doc-1",
                "batch-1",
                "version-1",
                "request-1",
                fingerprint,
                "org-1/doc-1",
                "statement.csv",
                "text/csv",
            )
        )
        worker = ExtractionWorker(
            repository,
            MemoryDocumentObjectStore({"org-1/doc-1": content}),
            EnterpriseDocumentEngine(),
        )
        self.assertTrue(worker.run_once())
        completed = repository.get("org-1", job.id)
        self.assertEqual(completed.state, "NEEDS_REVIEW")
        self.assertIsNotNone(repository.result("org-1", job.id))
        self.assertEqual(
            [event.to_state for event in repository.events("org-1", job.id)],
            ["QUEUED", "PROCESSING", "NEEDS_REVIEW"],
        )

    def test_fingerprint_mismatch_retries_then_dead_letters(self) -> None:
        repository = MemoryJobRepository()
        job = repository.submit(
            new_job(
                "org-1",
                "doc-1",
                "batch-1",
                "version-1",
                "request-1",
                "0" * 64,
                "org-1/doc-1",
                "statement.csv",
                "text/csv",
                max_attempts=2,
            )
        )
        worker = ExtractionWorker(
            repository,
            MemoryDocumentObjectStore({"org-1/doc-1": b"different"}),
            EnterpriseDocumentEngine(),
        )
        worker.run_once()
        self.assertEqual(repository.get("org-1", job.id).state, "RETRY")
        worker.run_once()
        self.assertEqual(repository.get("org-1", job.id).state, "DEAD_LETTER")

    def test_idempotency_conflict_is_rejected(self) -> None:
        repository = MemoryJobRepository()
        first = new_job(
            "org-1",
            "doc-1",
            "batch-1",
            "version-1",
            "same-key",
            "a" * 64,
            "org-1/object-1",
            "one.csv",
            "text/csv",
        )
        repository.submit(first)
        replay = repository.submit(first)
        self.assertEqual(replay.id, first.id)
        with self.assertRaisesRegex(ValueError, "another document"):
            repository.submit(
                new_job(
                    "org-1",
                    "doc-2",
                    "batch-2",
                    "version-2",
                    "same-key",
                    "b" * 64,
                    "org-1/object-2",
                    "two.csv",
                    "text/csv",
                )
            )

    def test_expired_worker_lease_is_recovered_and_reclaimed(self) -> None:
        repository = MemoryJobRepository(worker_id="worker-2")
        job = repository.submit(
            new_job(
                "org-1",
                "doc-lease",
                "batch-1",
                "version-lease",
                "lease-key",
                "c" * 64,
                "org-1/doc-lease",
                "lease.csv",
                "text/csv",
            )
        )
        claimed = repository.claim_next()
        assert claimed is not None
        repository._jobs[job.id] = replace(
            claimed,
            lease_expires_at=(datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
        )
        reclaimed = repository.claim_next()
        assert reclaimed is not None
        self.assertEqual(reclaimed.id, job.id)
        self.assertEqual(reclaimed.attempt_count, 2)
        self.assertTrue(reclaimed.claimed_by.startswith("worker-2:"))
        with self.assertRaisesRegex(ValueError, "not processing"):
            repository.fail(claimed, "stale worker")
        self.assertEqual(
            [event.to_state for event in repository.events("org-1", job.id)],
            ["QUEUED", "PROCESSING", "RETRY", "PROCESSING"],
        )

    def test_object_key_path_traversal_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "not normalized"):
            new_job(
                "org-1",
                "doc-1",
                "batch-1",
                "version-1",
                "key-1",
                "a" * 64,
                "org-1/../other/document.pdf",
                "document.pdf",
                "application/pdf",
            )

    def test_object_store_write_is_idempotent_and_immutable(self) -> None:
        content = b"document"
        fingerprint = hashlib.sha256(content).hexdigest()
        store = MemoryDocumentObjectStore()
        store.write_verified("org-1/document", content, fingerprint, 100)
        store.write_verified("org-1/document", content, fingerprint, 100)
        with self.assertRaisesRegex(ValueError, "other content"):
            store.write_verified(
                "org-1/document",
                b"changed",
                hashlib.sha256(b"changed").hexdigest(),
                100,
            )


if __name__ == "__main__":
    unittest.main()
