import unittest

from agents.shared.schemas import AgentOutput, Confidence, Evidence, Money


class SchemaTests(unittest.TestCase):
    def test_agent_output_requires_evidence(self) -> None:
        output = AgentOutput(
            organization_id="org-1",
            agent_name="reconciliation_agent",
            output_type="suggestion",
            action="suggest match",
            confidence=Confidence(score=0.8, tier="suggested", method="rule+agent"),
            evidence=[],
        )
        with self.assertRaises(ValueError):
            output.validate()

    def test_agent_cannot_post_without_human_approval(self) -> None:
        evidence = Evidence(
            source_document_id="doc-1",
            source_record_id="row-1",
            transaction_reference="TXN-1",
            occurred_on="2026-01-01",
            amount=Money(currency="RWF", minor_units=100000, precision=0),
            confidence=Confidence(score=0.9, tier="suggested", method="fixture"),
            reason="references match",
            ingestion_batch_id="batch-1",
            extraction_version_id="version-1",
        )
        output = AgentOutput(
            organization_id="org-1",
            agent_name="reconciliation_agent",
            output_type="suggestion",
            action="post ledger entry",
            confidence=Confidence(score=0.9, tier="suggested", method="fixture"),
            evidence=[evidence],
            requires_human_approval=False,
        )
        with self.assertRaises(ValueError):
            output.validate()

    def test_agent_cannot_disguise_execution_action(self) -> None:
        evidence = Evidence(
            source_document_id="doc-1",
            source_record_id="row-1",
            transaction_reference="TXN-1",
            occurred_on="2026-01-01",
            amount=Money(currency="RWF", minor_units=100000, precision=0),
            confidence=Confidence(score=0.9, tier="suggested", method="fixture"),
            reason="references match",
            ingestion_batch_id="batch-1",
            extraction_version_id="version-1",
        )
        output = AgentOutput(
            organization_id="org-1",
            agent_name="reconciliation_agent",
            output_type="suggestion",
            action="execute_payment",
            confidence=Confidence(score=0.9, tier="suggested", method="fixture"),
            evidence=[evidence],
        )
        with self.assertRaises(ValueError):
            output.validate()


if __name__ == "__main__":
    unittest.main()
