# External Integration Readiness

Last verified: 2026-07-12

This document is the source of truth for third-party readiness. A stored connector record does not, by itself, mean a provider API is operational.

## Current Status

| Integration | Current capability | Production ready | Required next input |
| --- | --- | --- | --- |
| MTN MoMo Collections | Real sandbox client, auth, balance, account validation, request-to-pay, status polling, callbacks, replay-safe import, and request history | No | Production onboarding, production credentials, public HTTPS callback, secret manager, and staging validation |
| Bank of Kigali | Generic bank-statement/manual import through the connector and ingestion pipeline | No live bank feed | Anonymized statement fixtures now; bank API or open-banking agreement later |
| EBM / RRA | Generic connector kind and normalization target only | No | Export samples, schema mapping, or approved sandbox/API access |
| Airtel Money | Generic connector framework only | No | Provider documentation, sandbox credentials, callback requirements, and test numbers |
| QuickBooks | Generic accounting import framework only | No | Intuit developer app, OAuth client credentials, sandbox company, and approved scopes |
| Sage | Generic accounting import framework only | No | Sage developer app, sandbox tenant, and OAuth credentials |
| Xero | Generic accounting import framework only | No | Xero developer app, demo organization, and OAuth credentials |
| Email / SMS | In-app mailbox and notification state only; no external delivery | No | Provider selection and sandbox credentials, such as SMTP/SendGrid and an SMS provider |

## MTN MoMo Configuration

Development requires:

- `MOMO_BASE_URL`
- `MOMO_TARGET_ENVIRONMENT`
- `MOMO_COLLECTION_SUBSCRIPTION_KEY`
- `MOMO_COLLECTION_API_USER`
- `MOMO_COLLECTION_API_KEY`
- `MOMO_DEFAULT_CONNECTION_ID`

Callbacks and automatic import additionally require:

- `MOMO_CALLBACK_BASE_URL`: publicly reachable HTTPS URL
- `MOMO_CALLBACK_TOKEN`: random secret used to authenticate callbacks
- `MOMO_CALLBACK_AUTO_IMPORT=true`
- `MOMO_CALLBACK_ACTOR_USER_ID`
- `MOMO_SYNC_ORGANIZATION_ID`
- `MOMO_SYNC_CONNECTION_ID`
- `MOMO_SYNC_ACTOR_USER_ID`

Production must use a secrets manager. Environment-file secrets are development-only. Sandbox keys already shared during development should be regenerated before the repository or environment is shared with another person.

## Readiness Rules

The frontend and gateway use these labels:

- `sandbox`: a real sandbox adapter exists and a stored sandbox connection is configured.
- `manual_import`: Kora can ingest provider exports, but no live provider API is connected.
- `not_implemented`: provider-specific OAuth/API/callback logic is absent.

Unsupported providers must not be shown as connected. Their Connect action returns `501 Not Implemented` until an adapter exists. Kora never creates a fake connection ID to make an integration appear ready.

## Internal Dependencies

These can run locally and do not require paid external APIs:

- PostgreSQL
- TimescaleDB
- Redis
- MinIO
- local document AI/OCR service
- local agent runtime

Production still needs infrastructure decisions for hosting, backups, TLS, DNS, secrets, monitoring, and malware scanning. Those are deployment dependencies, not missing frontend/backend contracts.

## Release Gate

An external integration may be called production-ready only after all of the following pass:

1. Provider credentials are stored outside source control.
2. Tenant-scoped authorization and consent rules are tested.
3. Retries and callbacks are idempotent.
4. Duplicate provider records do not create duplicate business events.
5. A provider sandbox or staging flow succeeds through Kora APIs.
6. Failure, timeout, and replay scenarios are tested.
7. Logs and audit events contain no secrets.
8. Operations has a credential-rotation and incident procedure.
