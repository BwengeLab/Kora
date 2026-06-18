# Kora

Kora is a generic finance and relationship operating layer for businesses. It turns scattered source data such as statements, invoices, receipts, contracts, and connector records into evidence-backed business events, reconciliations, approvals, ledger postings, reports, credit passports, and ROI metrics.

The first vertical adapter is insurance, but the core domain is intentionally generic.

## Current Implementation Status

This repository currently implements the foundation scaffold for the full system plan:

- Monorepo layout for Go services, Python agents, protobuf contracts, infra, scripts, docs, and test data.
- Core protobuf contracts for common domain types, trust spine, ingestion, event ledger, reconciliation, workflow, ledger, consent, and agents.
- Go service skeletons with health endpoints.
- Shared Go libraries for evidence validation, audit immutability helpers, tenant checks, idempotency, policies, and correction events.
- Python document AI, agent runtime, and agent evaluation scaffolds.
- Docker Compose for local datastores.
- Synthetic fixture generator and baseline tests.

## Local Commands

PowerShell is the primary local runner on this Windows workspace:

```powershell
./scripts/kora.ps1 test
./scripts/kora.ps1 seed
./scripts/kora.ps1 up
./scripts/kora.ps1 down
```

If `make` is installed, equivalent targets are available:

```bash
make test
make seed
make up
make down
```

Go and protoc are expected to run either through a local installation or Docker images. This machine currently has Docker and Python installed; Go, protoc, and make are not required for the Python-only foundation tests.

## Core Rule

Kora agents can suggest, explain, classify, draft, and score. They never approve or post financial actions. Every consequential output must carry evidence, tenant context, confidence, and auditability.

