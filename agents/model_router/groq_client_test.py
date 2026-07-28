import unittest
from unittest.mock import patch

from agents.model_router.groq_client import GroqClient, GroqError


class GroqClientTests(unittest.TestCase):
    def test_requires_api_key(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(ValueError, "GROQ_API_KEY"):
                GroqClient()

    def test_parses_completion_and_usage(self) -> None:
        result = GroqClient._parse(
            {
                "model": "fixture-model",
                "choices": [{"message": {"content": " grounded answer "}}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 3},
            }
        )
        self.assertEqual(result.text, "grounded answer")
        self.assertEqual(result.prompt_tokens, 12)
        self.assertEqual(result.completion_tokens, 3)

    def test_rejects_malformed_response(self) -> None:
        with self.assertRaises(GroqError):
            GroqClient._parse({"model": "fixture-model", "choices": []})


if __name__ == "__main__":
    unittest.main()

