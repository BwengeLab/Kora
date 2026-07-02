from __future__ import annotations

from dataclasses import asdict
import os
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from agents.data_intake_agent.agent import AGENT_NAME as INTAKE_AGENT, run as run_intake
from agents.audit_compliance_agent.agent import (
    AGENT_NAME as AUDIT_COMPLIANCE_AGENT,
    run as run_audit_compliance,
)
from agents.collections_agent.agent import AGENT_NAME as COLLECTIONS_AGENT, run as run_collections
from agents.credit_passport_agent.agent import (
    AGENT_NAME as CREDIT_PASSPORT_AGENT,
    run as run_credit_passport,
)
from agents.finance_intelligence_agent.agent import (
    AGENT_NAME as FINANCE_INTELLIGENCE_AGENT,
    run as run_finance_intelligence,
)
from agents.sales_growth_agent.agent import AGENT_NAME as SALES_GROWTH_AGENT, run as run_sales_growth
from agents.supplier_margin_agent.agent import (
    AGENT_NAME as SUPPLIER_MARGIN_AGENT,
    run as run_supplier_margin,
)
from agents.evaluation.evaluator import FeedbackStore, evaluate_output, load_cases
from agents.reconciliation_agent.agent import (
    AGENT_NAME as RECONCILIATION_AGENT,
    run as run_reconciliation,
)
from agents.runtime.runtime import AgentRequest, AgentRuntime
from agents.runtime.auth import Identity, verify_gateway_token
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
    dataset_id: str = Field(min_length=1)
    case_id: str = Field(min_length=1)


repository = None
if os.getenv("DATABASE_URL"):
    from agents.runtime.postgres_repository import PostgresAgentRepository

    repository = PostgresAgentRepository(os.environ["DATABASE_URL"])

runtime = AgentRuntime(repository=repository)
runtime.register(INTAKE_AGENT, run_intake, {"classification", "review_request"})
runtime.register(RECONCILIATION_AGENT, run_reconciliation, {"suggestion"})
runtime.register(CREDIT_PASSPORT_AGENT, run_credit_passport, {"explanation"})
runtime.register(FINANCE_INTELLIGENCE_AGENT, run_finance_intelligence, {"explanation"})
runtime.register(COLLECTIONS_AGENT, run_collections, {"suggestion"})
runtime.register(SUPPLIER_MARGIN_AGENT, run_supplier_margin, {"suggestion"})
runtime.register(AUDIT_COMPLIANCE_AGENT, run_audit_compliance, {"review_request"})
runtime.register(SALES_GROWTH_AGENT, run_sales_growth, {"explanation"})
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
JWT_SECRET = os.getenv("KORA_JWT_SECRET", "")
if os.getenv("KORA_ENV") == "production" and (
    not INTERNAL_TOKEN
    or not JWT_SECRET
    or INTERNAL_TOKEN == "development-only-agent-token"
    or JWT_SECRET == "development-only-jwt-secret"
):
    raise RuntimeError("strong agent runtime and JWT secrets are required in production")


def authenticate(
    x_kora_internal_token: str = Header(default=""),
    authorization: str = Header(default=""),
) -> Identity | None:
    if INTERNAL_TOKEN and x_kora_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal service token")
    if not JWT_SECRET:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing gateway bearer token")
    try:
        return verify_gateway_token(authorization.removeprefix("Bearer "), JWT_SECRET)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def enforce_identity(identity: Identity | None, organization_id: str, user_id: str = "") -> None:
    if identity is None:
        return
    if identity.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="cross-tenant request denied")
    if user_id and identity.user_id != user_id:
        raise HTTPException(status_code=403, detail="request user does not match gateway identity")


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"service": "agent_runtime", "status": "ok"}


@app.post("/v1/agent-runs")
def run_agent(
    request: RunAgentRequest, identity: Identity | None = Depends(authenticate)
) -> dict[str, Any]:
    enforce_identity(identity, request.organization_id, request.user_id)
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


@app.get("/v1/agent-runs/{run_id}")
def get_run(
    run_id: str,
    organization_id: str,
    identity: Identity | None = Depends(authenticate),
) -> dict[str, Any]:
    enforce_identity(identity, organization_id)
    try:
        return asdict(runtime.get_run(organization_id, run_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post(
    "/v1/agent-feedback",
    status_code=201,
)
def add_feedback(
    request: FeedbackRequest, identity: Identity | None = Depends(authenticate)
) -> dict[str, Any]:
    enforce_identity(identity, request.organization_id, request.reviewer_user_id)
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


@app.post("/v1/agent-evaluations")
def evaluate_run(
    request: EvaluationRequest, identity: Identity | None = Depends(authenticate)
) -> dict[str, Any]:
    enforce_identity(identity, request.organization_id)
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
