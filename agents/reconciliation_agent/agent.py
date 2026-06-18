from agents.shared.schemas import AgentOutput, Confidence, Evidence


def suggest_match(evidence: list[Evidence], explanation: str) -> AgentOutput:
    if not evidence:
        raise ValueError("reconciliation agent requires evidence")
    output = AgentOutput(
        agent_name="reconciliation_agent",
        action=f"suggest match: {explanation}",
        confidence=Confidence(score=0.82, tier="suggested", method="agent+evidence"),
        evidence=evidence,
        requires_human_approval=True,
    )
    output.validate()
    return output

