from __future__ import annotations

from dataclasses import asdict, dataclass, replace
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Callable, Protocol, Sequence
from uuid import uuid4
import hashlib
import json

from agents.model_router.router import ModelPlan, ModelRequest, route_model
from agents.shared.schemas import AgentOutput, Evidence, FrozenDict, refusal_output


AgentHandler = Callable[["AgentRequest"], AgentOutput]


@dataclass(frozen=True)
class AgentRequest:
    organization_id: str
    user_id: str
    agent_name: str
    objective: str
    evidence: Sequence[Evidence]
    context: dict[str, Any]
    estimated_complexity: str = "low"
    contains_sensitive_financial_data: bool = True
    external_models_allowed: bool = False
    idempotency_key: str = ""

    def __post_init__(self) -> None:
        object.__setattr__(self, "evidence", tuple(self.evidence))
        object.__setattr__(self, "context", FrozenDict(self.context))

    def validate(self) -> None:
        if not self.organization_id or not self.user_id:
            raise ValueError("organization_id and user_id are required")
        if not self.agent_name or not self.objective:
            raise ValueError("agent_name and objective are required")
        if self.estimated_complexity not in {"low", "medium", "high"}:
            raise ValueError("estimated_complexity is invalid")
        try:
            json.dumps(self.context, sort_keys=True)
        except (TypeError, ValueError) as exc:
            raise ValueError("agent context must be JSON serializable") from exc


@dataclass(frozen=True)
class RunRecord:
    run_id: str
    organization_id: str
    user_id: str
    agent_name: str
    objective: str
    idempotency_key: str
    request_fingerprint: str
    model_route: str
    external_model: bool
    redacted_fields: tuple[str, ...]
    output: AgentOutput
    created_at: str


class RunRepository(Protocol):
    def find_by_idempotency(
        self, organization_id: str, idempotency_key: str
    ) -> RunRecord | None: ...

    def get_run(self, organization_id: str, run_id: str) -> RunRecord | None: ...

    def save_run(self, record: RunRecord) -> RunRecord: ...


class ModelGenerator(Protocol):
    def generate(self, system_prompt: str, user_prompt: str) -> Any: ...


class AgentRuntime:
    def __init__(self, repository: RunRepository | None = None, model: ModelGenerator | None = None) -> None:
        self._handlers: dict[str, AgentHandler] = {}
        self._allowed_output_types: dict[str, set[str]] = {}
        self._runs: dict[str, RunRecord] = {}
        self._idempotency: dict[tuple[str, str], str] = {}
        self._lock = RLock()
        self._repository = repository
        self._model = model

    def register(
        self,
        agent_name: str,
        handler: AgentHandler,
        allowed_output_types: set[str] | None = None,
    ) -> None:
        if not agent_name or agent_name in self._handlers:
            raise ValueError("agent name must be unique and non-empty")
        self._handlers[agent_name] = handler
        self._allowed_output_types[agent_name] = allowed_output_types or set()

    def run(self, request: AgentRequest) -> RunRecord:
        request.validate()
        idempotency_key = request.idempotency_key or f"generated_{uuid4().hex}"
        request_fingerprint = self._fingerprint(request)
        with self._lock:
            existing_id = self._idempotency.get(
                (request.organization_id, idempotency_key)
            )
            if existing_id:
                existing = self._runs[existing_id]
                if existing.request_fingerprint != request_fingerprint:
                    raise ValueError("idempotency key was reused with a different request")
                return existing
        if self._repository:
            persisted = self._repository.find_by_idempotency(
                request.organization_id, idempotency_key
            )
            if persisted:
                if persisted.request_fingerprint != request_fingerprint:
                    raise ValueError("idempotency key was reused with a different request")
                with self._lock:
                    self._runs[persisted.run_id] = persisted
                    self._idempotency[
                        (request.organization_id, idempotency_key)
                    ] = persisted.run_id
                return persisted
        handler = self._handlers.get(request.agent_name)
        if handler is None:
            raise ValueError("unknown agent")
        plan = self._route(request)
        run_id = f"agent_run_{uuid4().hex}"
        if not request.evidence:
            output = refusal_output(
                request.organization_id,
                request.agent_name,
                "insufficient evidence: no source records were supplied",
            )
        else:
            for item in request.evidence:
                item.validate(require_provenance=True)
            output = handler(
                replace(request, context=plan.sanitized_context)
            )
            self._validate_grounding(request, output)
            allowed_types = self._allowed_output_types[request.agent_name]
            if allowed_types and output.output_type not in allowed_types:
                raise ValueError("agent returned an unauthorized output type")
            output = self._enrich_with_model(request, plan, output)
        output = replace(output, run_id=run_id)
        output.validate()
        record = RunRecord(
            run_id=run_id,
            organization_id=request.organization_id,
            user_id=request.user_id,
            agent_name=request.agent_name,
            objective=request.objective,
            idempotency_key=idempotency_key,
            request_fingerprint=request_fingerprint,
            model_route=plan.route,
            external_model=plan.external,
            redacted_fields=plan.redacted_fields,
            output=output,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        with self._lock:
            existing_id = self._idempotency.get(
                (request.organization_id, idempotency_key)
            )
            if existing_id:
                existing = self._runs[existing_id]
                if existing.request_fingerprint != request_fingerprint:
                    raise ValueError("idempotency key was reused with a different request")
                return existing
            if self._repository:
                record = self._repository.save_run(record)
            self._runs[record.run_id] = record
            self._idempotency[(request.organization_id, idempotency_key)] = record.run_id
        return record

    def get_run(self, organization_id: str, run_id: str) -> RunRecord:
        with self._lock:
            record = self._runs.get(run_id)
        if record is None and self._repository:
            record = self._repository.get_run(organization_id, run_id)
            if record:
                with self._lock:
                    self._runs[run_id] = record
        if record is None or record.organization_id != organization_id:
            raise ValueError("agent run not found")
        return record

    def list_runs(self, organization_id: str) -> list[RunRecord]:
        with self._lock:
            return [
                record
                for record in self._runs.values()
                if record.organization_id == organization_id
            ]

    def validate_output(self, output: AgentOutput) -> AgentOutput:
        output.validate()
        return output

    def refuse_missing_evidence(self, agent_name: str, action: str) -> AgentOutput:
        return refusal_output("unknown", agent_name, f"missing evidence for {action}")

    @staticmethod
    def _route(request: AgentRequest) -> ModelPlan:
        return route_model(
            ModelRequest(
                objective=request.objective,
                contains_sensitive_financial_data=request.contains_sensitive_financial_data,
                estimated_complexity=request.estimated_complexity,
                context=request.context,
                external_models_allowed=request.external_models_allowed,
            )
        )

    def _enrich_with_model(
        self, request: AgentRequest, plan: ModelPlan, output: AgentOutput
    ) -> AgentOutput:
        metadata = dict(output.metadata)
        metadata["model_route"] = plan.route
        if not plan.external:
            metadata["model_status"] = "not_allowed"
            return replace(output, metadata=metadata)
        if self._model is None:
            metadata["model_status"] = "unavailable"
            return replace(output, metadata=metadata)
        prompt = json.dumps(
            {
                "objective": request.objective,
                "sanitized_context": plan.sanitized_context,
                "deterministic_action": output.action,
                "deterministic_explanation": metadata.get("explanation", ""),
            },
            sort_keys=True,
            default=str,
        )
        try:
            response = self._model.generate(
                "You explain Kora's deterministic finance analysis. Use only the supplied JSON. "
                "Do not invent facts, approve actions, or recommend moving money. Return a concise explanation.",
                prompt,
            )
            metadata.update(
                {
                    "explanation": response.text,
                    "model_status": "completed",
                    "model_name": response.model,
                    "model_prompt_tokens": response.prompt_tokens,
                    "model_completion_tokens": response.completion_tokens,
                }
            )
        except Exception as exc:
            metadata["model_status"] = "failed"
            metadata["model_error"] = type(exc).__name__
        return replace(output, metadata=metadata)

    @staticmethod
    def _validate_grounding(request: AgentRequest, output: AgentOutput) -> None:
        if output.organization_id != request.organization_id:
            raise ValueError("agent output belongs to another organization")
        if output.agent_name != request.agent_name:
            raise ValueError("agent output name does not match request")
        supplied = set(request.evidence)
        returned = set(output.evidence)
        if not returned.issubset(supplied):
            raise ValueError("agent output cites evidence not supplied to the run")

    @staticmethod
    def _fingerprint(request: AgentRequest) -> str:
        payload = asdict(request)
        payload.pop("idempotency_key", None)
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()
