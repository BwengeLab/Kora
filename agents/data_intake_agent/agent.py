from agents.shared.schemas import AgentOutput, Confidence, Evidence


def classify_quality(evidence: list[Evidence], quality_flags: list[str]) -> AgentOutput:
    if not evidence:
        raise ValueError("data intake agent requires evidence")
    action = "request review" if quality_flags else "accept extraction"
    score = 0.65 if quality_flags else 0.95
    output = AgentOutput(
        agent_name="data_intake_agent",
        action=action,
        confidence=Confidence(score=score, tier="review" if quality_flags else "auto", method="quality-rules"),
        evidence=evidence,
        requires_human_approval=bool(quality_flags),
        metadata={"quality_flags": quality_flags},
    )
    output.validate()
    return output

