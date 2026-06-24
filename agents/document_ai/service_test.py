import base64
import hashlib
import unittest

from fastapi.testclient import TestClient

from fastapi import HTTPException

from agents.document_ai.service import MAX_INLINE_BYTES, app, decode_inline_content


class DocumentAIServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health(self) -> None:
        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_extract_csv_returns_ingestion_ready_records(self) -> None:
        content = b"date,reference,amount,currency,type\n2026-01-01,INV-1,1000,RWF,payment\n"
        response = self.client.post(
            "/v1/documents/extract",
            json={
                "organization_id": "org-1",
                "source_document_id": "doc-1",
                "ingestion_batch_id": "batch-1",
                "extraction_version_id": "xver-1",
                "file_name": "statement.csv",
                "content_type": "text/csv",
                "content_base64": base64.b64encode(content).decode("ascii"),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["parser"], "csv")
        self.assertEqual(body["records"][0]["source_location"]["row_number"], 2)
        self.assertGreater(body["records"][0]["field_confidences"]["reference"], 0.9)

    def test_invalid_base64_is_rejected(self) -> None:
        response = self.client.post(
            "/v1/documents/extract",
            json={
                "organization_id": "org-1",
                "source_document_id": "doc-1",
                "ingestion_batch_id": "batch-1",
                "extraction_version_id": "xver-1",
                "file_name": "statement.csv",
                "content_base64": "not-base64!",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_enterprise_analysis_returns_preflight_lineage_and_validation(self) -> None:
        content = b"date,reference,amount,currency,type\n2026-01-01,INV-1,1000,RWF,payment\n"
        response = self.client.post(
            "/v2/documents/analyze",
            json={
                "organization_id": "org-v2",
                "source_document_id": "doc-v2",
                "ingestion_batch_id": "batch-v2",
                "extraction_version_id": "version-v2",
                "file_name": "statement.csv",
                "content_type": "text/csv",
                "content_base64": base64.b64encode(content).decode("ascii"),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["inspection"]["disposition"], "accepted")
        self.assertTrue(body["raw_content"]["full_text"])
        self.assertEqual(body["extraction"]["records"], [])
        self.assertTrue(body["requires_human_review"])

    def test_neutral_content_endpoint_does_not_create_business_records(self) -> None:
        content = b"alpha,beta\n1,2\n"
        response = self.client.post(
            "/v2/documents/extract-content",
            json={
                "organization_id": "org-neutral",
                "source_document_id": "doc-neutral",
                "ingestion_batch_id": "batch-neutral",
                "extraction_version_id": "version-neutral",
                "file_name": "neutral.csv",
                "content_type": "text/csv",
                "content_base64": base64.b64encode(content).decode("ascii"),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["raw_content"]["full_text"], "alpha\tbeta\n1\t2")
        self.assertEqual(body["extraction"]["records"], [])
        self.assertEqual(body["raw_content"]["pages"][0]["tables"][0]["row_count"], 2)

    def test_invalid_ocr_language_is_rejected_by_schema(self) -> None:
        response = self.client.post(
            "/v2/documents/extract-content",
            json={
                "organization_id": "org-1",
                "source_document_id": "doc-1",
                "ingestion_batch_id": "batch-1",
                "extraction_version_id": "version-1",
                "file_name": "image.png",
                "content_base64": "eA==",
                "ocr_language": "eng;invalid",
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_oversized_inline_content_requires_async_path(self) -> None:
        encoded = base64.b64encode(b"x" * (MAX_INLINE_BYTES + 1)).decode("ascii")
        with self.assertRaises(HTTPException) as raised:
            decode_inline_content(encoded)
        self.assertEqual(raised.exception.status_code, 413)

    def test_async_job_submission_is_idempotent_and_tenant_scoped(self) -> None:
        fingerprint = hashlib.sha256(b"fixture").hexdigest()
        payload = {
            "organization_id": "org-job-api",
            "user_id": "user-job-api",
            "document_id": "doc-job-api",
            "ingestion_batch_id": "batch-job-api",
            "extraction_version_id": "version-job-api",
            "idempotency_key": "request-job-api",
            "document_fingerprint": fingerprint,
            "object_key": "org-job-api/doc-job-api",
            "file_name": "invoice.pdf",
            "content_type": "application/pdf",
        }
        first = self.client.post("/v2/extraction-jobs", json=payload)
        second = self.client.post("/v2/extraction-jobs", json=payload)
        self.assertEqual(first.status_code, 202, first.text)
        self.assertEqual(second.json()["id"], first.json()["id"])
        payload["object_key"] = "org-other/doc-job-api"
        payload["idempotency_key"] = "request-job-cross"
        denied = self.client.post("/v2/extraction-jobs", json=payload)
        self.assertEqual(denied.status_code, 400)


if __name__ == "__main__":
    unittest.main()
