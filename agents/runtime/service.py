from __future__ import annotations

from dataclasses import asdict
import os
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from agents.data_intake_agent.agent import AGENT_NAME as INTAKE_AGENT, run as run_intake
from agents.evaluation.evaluator import FeedbackStore, evaluate_output, load_cases
from agents.reconciliation_agent.agent import (
    AGENT_NAME as RECONCILIATION_AGENT,
    run as run_reconciliation,
)
from agents.runtime.runtime import AgentRequest, AgentRuntime
from agents.shared.schemas import Confidence, Evidence, Money


class ConfidenceInput(BaseModel):
    score: float = Field(ge=0, le=1)
    tier: str
    method: str
    calibration_version: str = "v1"


class MoneyInput(BaseModel):
    currency: str = Field(min_length=1)
    minor_units: int
    precision: int = Field(default=2, ge=0, le=6)


class EvidenceInput(BaseModel):
    source_document_id: str = Field(min_length=1)
    source_record_id: str = Field(min_length=1)
    transaction_reference: str = ""
    occurred_on: str = ""
    amount: MoneyInput | None = None
    confidence: ConfidenceInput
    reason: str = Field(min_length=1)
    responsible_party_id: str = ""
    suggested_action: str = ""
    ingestion_batch_id: str = Field(min_length=1)
    extraction_version_id: str = Field(min_length=1)
    source_page: int = Field(default=0, ge=0)
    source_row: int = Field(default=0, ge=0)
    source_sheet: str = ""


class RunAgentRequest(BaseModel):
    organization_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    agent_name: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    evidence: list[EvidenceInput] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    estimated_complexity: str = "low"
    contains_sensitive_financial_data: bool = True
    external_models_allowed: bool = False
    idempotency_key: str = ""


class FeedbackRequest(BaseModel):
    organization_id: str = Field(min_length=1)
    run_id: str = Field(min_length=1)
    reviewer_user_id: str = Field(min_length=1)
    label: str
    comment: str = ""


class EvaluationRequest(BaseModel):
    organization_id: str = Field(min_length=1)
    run_id: str = Field(min_length=1)
    case_id: str = Field(min_length=1)
    dataset_id: str = Field(min_length=1)
    case_id: str = Field(min_length=1)


repository = None
if os.getenv("DATABASE_URL"):
    from agents.runtime.postgres_repository import PostgresAgentRepository

    repository = PostgresAgentRepository(os.environ["DATABASE_URL"])

runtime = AgentRuntime(repository=repository)
runtime.register(INTAKE_AGENT, run_intake, {"classification", "review_request"})
runtime.register(RECONCILIATION_AGENT, run_reconciliation, {"suggestion"})
feedback = FeedbackStore(repository=repository)
EVALUATION_CASES = {
    case.case_id: case
    for case in load_cases(
        Path(__file__).resolve().parents[2]
        / "testdata"
        / "labels"
        / "agent_evaluation_cases.json"
    )
}
app = FastAPI(title="Kora Agent Runtime", version="1.0.0")
INTERNAL_TOKEN = os.getenv("KORA_AGENT_RUNTIME_TOKEN", "")
if os.getenv("KORA_ENV") == "production" and not INTERNAL_TOKEN:
    raise RuntimeError("KORA_AGENT_RUNTIME_TOKEN is required in production")


def require_internal_token(
    x_kora_internal_token: str = Header(default=""),
) -> None:
    if INTERNAL_TOKEN and x_kora_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal service token")


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"service": "agent_runtime", "status": "ok"}


@app.post("/v1/agent-runs", dependencies=[Depends(require_internal_token)])
def run_agent(request: RunAgentRequest) -> dict[str, Any]:
    try:
        record = runtime.run(
            AgentRequest(
                organization_id=request.organization_id,
                user_id=request.user_id,
                agent_name=request.agent_name,
                objective=request.objective,
                evidence=[_evidence(item) for item in request.evidence],
                context=request.context,
                estimated_complexity=request.estimated_complexity,
                contains_sensitive_financial_data=request.contains_sensitive_financial_data,
                external_models_allowed=request.external_models_allowed,
                idempotency_key=request.idempotency_key,
            )
        )
        return asdict(record)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/v1/agent-runs/{run_id}", dependencies=[Depends(require_internal_token)])
def get_run(run_id: str, organization_id: str) -> dict[str, Any]:
    try:
        return asdict(runtime.get_run(organization_id, run_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post(
    "/v1/agent-feedback",
    status_code=201,
    dependencies=[Depends(require_internal_token)],
)
def add_feedback(request: FeedbackRequest) -> dict[str, Any]:
    try:
        runtime.get_run(request.organization_id, request.run_id)
        return asdict(
            feedback.add(
                request.organization_id,
                request.run_id,
                request.reviewer_user_id,
                request.label,
                request.comment,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/v1/agent-evaluations", dependencies=[Depends(require_internal_token)])
def evaluate_run(request: EvaluationRequest) -> dict[str, Any]:
    try:
        run_record = runtime.get_run(request.organization_id, request.run_id)
        if request.dataset_id != "agent_evaluation_cases" or request.case_id not in EVALUATION_CASES:
            raise ValueError("unknown evaluation dataset or case")
        result = evaluate_output(
            run_record.output,
            EVALUATION_CASES[request.case_id],
        )
        if repository:
            repository.save_evaluation(
                request.organization_id, request.run_id, request.dataset_id, result
            )
        return asdict(result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _evidence(item: EvidenceInput) -> Evidence:
    amount = (
        Money(
            currency=item.amount.currency,
            minor_units=item.amount.minor_units,
            precision=item.amount.precision,
        )
        if item.amount
        else None
    )
    return Evidence(
        source_document_id=item.source_document_id,
        source_record_id=item.source_record_id,
        transaction_reference=item.transaction_reference,
        occurred_on=item.occurred_on,
        amount=amount,
        confidence=Confidence(**item.confidence.model_dump()),
        reason=item.reason,
        responsible_party_id=item.responsible_party_id,
        suggested_action=item.suggested_action,
        ingestion_batch_id=item.ingestion_batch_id,
        extraction_version_id=item.extraction_version_id,
        source_page=item.source_page,
        source_row=item.source_row,
        source_sheet=item.source_sheet,
    )
