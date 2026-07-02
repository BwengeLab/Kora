# Phase 16: Integrations

## Status

Implemented as a replay-safe connector import framework with offline/import connectors first. MTN MoMo sandbox provisioning and auth are now implemented in code, while EBM/RRA, bank, QuickBooks, Sage, Xero, email, and SMS APIs still require provider-specific adapters.

## Connector Architecture

`libs/connectors` validates connector connections, rejects raw credentials in config, requires secret references, converts connector records into existing ingestion source records, and normalizes those records through the generic Kora business event pipeline.

Supported connector kinds are:

- `MOMO`
- `EBM_RRA`
- `BANK_STATEMENT`
- `ACCOUNTING`
- `EMAIL_SMS`

The first implementation is intentionally provider-neutral. A MoMo CSV/API import and a bank statement import both produce the same `ingestion.SourceRecord` shape, which then produces generic events such as `PAYMENT_RECEIVED`, `PAYMENT_SENT`, `INVOICE_ISSUED`, or `BILL_RECEIVED`.

## MTN MoMo Sandbox Adapter

Kora now includes a provider-specific MTN MoMo sandbox client:

- `libs/connectors/momo/client.go`
- `services/integrations/cmd/momo-sandbox/main.go`
- `docs/24-MOMO-SANDBOX.md`

The adapter covers sandbox provisioning and auth:

- create API user
- create API key
- create access token
- collection balance lookup
- account-holder validation
- request-to-pay submission
- request-to-pay status lookup
- request-to-pay callback ingestion
- request lifecycle history
- provider transaction import into generic connector records
- bulk MoMo transaction sync import

MoMo request lifecycle persistence now has an append-only SQL schema:

- `deploy/migrations/022_momo_request_tracking.sql`
- `testdata/sql/phase16_momo_request_tracking_acceptance.sql`

Raw credentials are still not stored in connector config or persistence. Local development uses environment variables until a real secrets manager is wired in.

## Idempotency And Duplicate Control

Connector imports require an idempotency key and stable source record IDs. The import payload is canonically fingerprinted. Reusing the same idempotency key with the same payload replays the previous result. Importing the same payload with a new idempotency key is treated as duplicate source data and does not create new normalized events.

## API And Persistence

- `POST /v1/integrations/validate`
- `POST /v1/integrations/import`
- `proto/integrations/integrations.proto`
- `deploy/migrations/020_integrations_connectors.sql`

Persistence includes connector connections, connector sync runs, connector source records, and connector-to-business-event links. Credentials are represented by `secret_ref`; raw tokens, passwords, API keys, and client secrets are rejected.

## Verification

Tests cover raw credential rejection, missing secret rejection, connector replay, duplicate connector payloads with different idempotency keys, tenant/connection mismatch rejection, generic event normalization, service request validation, protobuf generation, and SQL acceptance for append-only connector persistence.

## Still Needed From Business Side

- MoMo sandbox/API access and later production onboarding approval.
- EBM/RRA sample exports or sandbox access.
- Bank statement/API samples.
- Accounting sandbox access for QuickBooks, Sage, or Xero.
- Email/SMS provider choice and sandbox credentials.
