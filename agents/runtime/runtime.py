from agents.shared.schemas import AgentOutput


class AgentRuntime:
    def validate_output(self, output: AgentOutput) -> AgentOutput:
        output.validate()
        return output

    def refuse_missing_evidence(self, agent_name: str, action: str) -> dict[str, str | bool]:
        return {
            "agent_name": agent_name,
            "action": action,
            "refused": True,
            "refusal_reason": "missing evidence",
        }

