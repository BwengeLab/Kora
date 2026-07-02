# Phase 18: Backend Production Hardening

## Status

Backend production-hardening foundations are implemented and verified locally. Cloud deployment, managed secrets, external monitoring accounts, load testing on production-sized data, and compliance review still require environment decisions.

## Observability

`libs/servicekit` now provides:

- Health responses with optional dependency statuses.
- Trace ID propagation through `X-Kora-Trace-ID`.
- Structured JSON request logs.
- In-memory counters rendered from `/metrics` in Prometheus text format.

`libs/operations` provides testable records for health reports, structured logs, metrics, security checks, backup manifests, restore drills, and tenant/model cost usage.

## Backup And Restore

Local scripts:

- `scripts/backup_postgres.ps1`
- `scripts/restore_drill_postgres.ps1`

The backup script writes a `pg_dump` and SHA-256 manifest. The restore drill verifies the checksum, restores into a separate database, and reports table-count verification.

## Security And Tenant Isolation

Phase 18 adds explicit operational security-check records. The first backend check records whether a cross-tenant access attempt was denied and keeps evidence. Existing RBAC, consent, and tenant tests remain the primary behavior checks.

## Cost Tracking

Tenant cost usage records track service, agent, model route, units, unit cost, and total cost in micros. The database enforces `total_cost_micros = units * unit_cost_micros`.

## Persistence

- `deploy/migrations/021_production_hardening.sql`
- `testdata/sql/phase18_production_hardening_acceptance.sql`

Tables are append-only:

- `operational_health_reports`
- `operational_request_logs`
- `operational_metrics`
- `backup_manifests`
- `restore_drills`
- `security_check_results`
- `tenant_cost_usage`

## Verification

Tests cover health aggregation, trace propagation, metrics rendering, structured JSON logging, backup manifest validation, restore checksum verification, tenant isolation checks, platform metric authorization, cost calculations, append-only persistence, and SQL acceptance.

## Still Needed Before Production

- Real secrets manager configuration.
- Managed observability stack selection.
- Staging and production environment provisioning.
- Load tests on realistic data volumes.
- Restore drill against staging infrastructure.
- Security review and compliance checklist review.
