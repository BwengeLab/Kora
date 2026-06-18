# Phase 0 Acceptance

Phase 0 is complete when:

- Local infrastructure starts with `./scripts/kora.ps1 up`.
- Synthetic fixtures generate with `./scripts/kora.ps1 seed`.
- Python tests pass with `./scripts/kora.ps1 py-test`.
- Go tests pass when Go 1.22+ is installed.
- Core protobuf contracts define tenant context, money, evidence, confidence, business events, corrections, approvals, ledger entries, rule policies, consent grants, and agent evaluation results.
- Service skeletons expose `/healthz`.
- The repository documents the generic core domain and keeps insurance in an adapter layer.

