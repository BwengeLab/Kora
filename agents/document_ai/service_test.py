import base64
import unittest

from fastapi.testclient import TestClient

from agents.document_ai.service import app


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


if __name__ == "__main__":
    unittest.main()
