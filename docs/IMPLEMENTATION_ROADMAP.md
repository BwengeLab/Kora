# Kora Implementation Roadmap

This repository should be built in release gates, not as one large unfocused feature push.

For the full canonical phase-by-phase plan, use `docs/10-BUILD-PLAN.md`. This file is the compact gate tracker.

## Gate 1: Foundation

- Monorepo scaffold.
- Core protobuf contracts.
- Local datastore compose stack.
- Health-checking service skeletons.
- Synthetic fixtures.
- CI and task runner.

## Gate 2: Trust Spine

- Identity and access.
- Tenant isolation.
- RBAC.
- Segregation of duties.
- Evidence validation.
- Immutable audit records.
- Persistence tables for organizations, users, role bindings, audit entries, and SoD rules.

## Gate 3: Idempotent Intake

- Idempotency keys.
- File fingerprinting.
- Ingestion batches.
- Source record IDs.
- Extraction versions.
- Replay-safe jobs.

## Gate 4: Generic Event Ledger

- Generic business events.
- Correction events.
- Reversal and adjustment flows.
- Entity resolution.
- Source provenance.

## Gate 5: Reconciliation

- Configurable policy engine.
- Deterministic matching.
- Confidence tiers.
- Exception routing.
- Duplicate detection.

## Gate 6: Insurance MVP

- Insurance adapter only.
- No insurance types in the generic ledger.
- Premiums, claims, brokers, policies, commissions, and supplier payments mapped onto core objects.
