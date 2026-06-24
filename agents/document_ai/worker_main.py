from __future__ import annotations

import os
import time

from agents.document_ai.enterprise_engine import EnterpriseDocumentEngine
from agents.document_ai.object_store import MinioDocumentObjectStore
from agents.document_ai.postgres_jobs import PostgresJobRepository
from agents.document_ai.preflight import ClamAVCommandScanner, PreflightPolicy
from agents.document_ai.worker import ExtractionWorker


def main() -> None:
    repository = PostgresJobRepository(os.environ["DATABASE_URL"])
    store = MinioDocumentObjectStore(
        endpoint=os.environ["MINIO_ENDPOINT"],
        access_key=os.environ["MINIO_ACCESS_KEY"],
        secret_key=os.environ["MINIO_SECRET_KEY"],
        bucket=os.getenv("MINIO_DOCUMENT_BUCKET", "kora-documents"),
        secure=os.getenv("MINIO_SECURE", "false").lower() == "true",
    )
    engine = EnterpriseDocumentEngine(
        preflight_policy=PreflightPolicy(require_malware_scan=True),
        malware_scanner=ClamAVCommandScanner(),
    )
    worker = ExtractionWorker(repository, store, engine)
    poll_seconds = float(os.getenv("KORA_EXTRACTION_POLL_SECONDS", "2"))
    while True:
        processed = worker.run_once()
        if not processed:
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
