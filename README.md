# Kora

Kora is a generic finance and relationship operating layer for businesses. It turns scattered source data such as statements, invoices, receipts, contracts, and connector records into evidence-backed business events, reconciliations, approvals, ledger postings, reports, credit passports, and ROI metrics.

The first vertical adapter is insurance, but the core domain is intentionally generic.

## Current Implementation Status

This repository currently implements the foundation, trust spine, policy engine, idempotent ingestion, document extraction, and generic business-event phases of the full system plan:

- Monorepo layout for Go services, Python agents, protobuf contracts, infra, scripts, docs, and test data.
- Core protobuf contracts for common domain types, trust spine, ingestion, event ledger, reconciliation, workflow, ledger, consent, and agents.
- Go service skeletons with health endpoints.
- Shared Go libraries for evidence validation, audit immutability helpers, tenant checks, idempotency, policies, and correction events.
- Python Document AI service with CSV, Excel, PDF, and receipt/image extraction, field confidence, review flags, and golden fixtures.
- Generic normalization, tenant-scoped entity resolution, append-only business events, and reversal/adjustment correction streams.
- Docker Compose for local datastores. The Phase 0 Postgres image boots without requiring pgvector; the migration enables pgvector automatically when the extension is available.
- Synthetic fixture generator and baseline tests.

The canonical build plan lives at `docs/10-BUILD-PLAN.md`.

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
