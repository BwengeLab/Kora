import unittest

from agents.model_router.router import ModelRequest, route_model


class RouterTests(unittest.TestCase):
    def test_sensitive_data_stays_private_and_is_minimized(self) -> None:
        plan = route_model(
            ModelRequest(
                objective="review",
                contains_sensitive_financial_data=True,
                estimated_complexity="high",
                external_models_allowed=True,
                context={"account_number": "123", "score": 0.8},
            )
        )
        self.assertFalse(plan.external)
        self.assertNotIn("account_number", plan.sanitized_context)
        self.assertEqual(plan.sanitized_context["score"], 0.8)


if __name__ == "__main__":
    unittest.main()
