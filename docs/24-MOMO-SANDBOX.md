# MTN MoMo Sandbox Integration

## What Is Implemented

Kora now includes a live MTN MoMo sandbox client in `libs/connectors/momo/client.go` and a local developer utility in `services/integrations/cmd/momo-sandbox/main.go`.

The client supports:

- create API user
- create API key
- create access token
- query collection account balance
- validate account holder activity
- create request-to-pay
- query request-to-pay status

The integrations service now exposes MoMo endpoints for:

- auth validation
- balance lookup
- account-holder validation
- request-to-pay submission
- request-to-pay status lookup
- request lifecycle history lookup
- import of successful request-to-pay activity into the generic Kora connector pipeline
- callback ingestion for provider-side status updates
- direct provider transaction import into the generic connector pipeline
- bulk provider transaction sync import

## Request Lifecycle

Kora now tracks MoMo request-to-pay state through an append-only in-memory request store in `libs/connectors/momo/store.go`.

Tracked request states include:

- `PENDING`
- `SUCCESSFUL`
- `FAILED`
- `RECEIVED`
- `UNKNOWN`

Each provider update appends a new lifecycle event instead of mutating prior history. This mirrors the append-only control pattern used elsewhere in Kora.

The database-side append-only schema for durable persistence now exists in:

- `deploy/migrations/022_momo_request_tracking.sql`
- `testdata/sql/phase16_momo_request_tracking_acceptance.sql`

This keeps live provider logic outside the generic connector normalization pipeline. The connector layer still owns replay-safe imports and generic event creation.

## Local Usage

Set local environment variables without committing them:

```powershell
$env:MOMO_COLLECTION_SUBSCRIPTION_KEY="..."
$env:MOMO_COLLECTION_API_USER="..."
$env:MOMO_COLLECTION_API_KEY="..."
$env:MOMO_COLLECTION_CALLBACK_HOST="example.com"
```

Provision a sandbox API user and API key:

```powershell
go run ./services/integrations/cmd/momo-sandbox provision --reference-id "<uuid>"
```

Fetch an access token:

```powershell
go run ./services/integrations/cmd/momo-sandbox token
```

Check collection balance:

```powershell
go run ./services/integrations/cmd/momo-sandbox balance
```

## What Still Remains

- Persist secrets in a real secrets manager instead of local environment variables.
- Wire the in-memory request tracker to the durable MoMo request tables.
- Add a scheduled Kora-owned sync worker that pulls MoMo transaction history automatically and pushes it through the bulk import path.
- Add webhook/callback ingestion once a public callback endpoint exists.
- Validate country-specific production onboarding requirements before live deployment.
