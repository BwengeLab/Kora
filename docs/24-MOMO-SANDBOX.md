# MTN MoMo Sandbox Integration

## What Is Implemented

Kora now includes a live MTN MoMo sandbox client in `libs/connectors/momo/client.go` and a local developer utility in `services/integrations/cmd/momo-sandbox/main.go`.

For operating the Kora backend itself, the repo now also includes `services/integrations/cmd/momo-kora/main.go`.

The client supports:

- create API user
- create API key
- create access token
- query collection account balance
- validate account holder activity
- create request-to-pay
- query request-to-pay status

The integrations service now exposes MoMo endpoints for:

- connector connection registration and lookup
- auth validation
- balance lookup
- account-holder validation
- request-to-pay submission
- request-to-pay status lookup
- bulk request status refresh with optional auto-import
- request lifecycle history lookup
- import of successful request-to-pay activity into the generic Kora connector pipeline
- callback ingestion for provider-side status updates
- MTN-style provider callback listener with optional callback-token verification
- direct provider transaction import into the generic connector pipeline
- bulk provider transaction sync import

The integrations server can also run automatic status refresh and import when configured through environment variables.

## Request Lifecycle

Kora now tracks MoMo request-to-pay state through:

- an append-only in-memory request store in `libs/connectors/momo/store.go`
- an append-only persisted journal store in `libs/connectors/momo/journal_store.go`
- a direct SQL-backed tracker in `libs/connectors/momo/sql_store.go`

Tracked request states include:

- `PENDING`
- `SUCCESSFUL`
- `FAILED`
- `RECEIVED`
- `UNKNOWN`

Each provider update appends a new lifecycle event instead of mutating prior history. This mirrors the append-only control pattern used elsewhere in Kora.

To persist request tracking across service restarts in the current runtime model, set:

```powershell
$env:MOMO_REQUEST_JOURNAL_PATH="C:\\path\\to\\momo-request-journal.jsonl"
```

To use the direct SQL-backed tracker instead, set either:

```powershell
$env:MOMO_TRACKER_DATABASE_URL="postgres://kora:kora@localhost:5432/kora?sslmode=disable"
```

or rely on the existing `DATABASE_URL` environment variable and provide a valid default connector id:

```powershell
$env:MOMO_DEFAULT_CONNECTION_ID="conn_momo"
```

To enable automatic status refresh and auto-import in the integrations server process, set:

```powershell
$env:MOMO_SYNC_INTERVAL_SECONDS="60"
$env:MOMO_SYNC_ORGANIZATION_ID="org_1"
$env:MOMO_SYNC_CONNECTION_ID="conn_momo"
$env:MOMO_SYNC_CONNECTION_DISPLAY_NAME="MTN MoMo"
$env:MOMO_SYNC_CONNECTION_SECRET_REF="secret://org_1/momo"
$env:MOMO_SYNC_ACTOR_USER_ID="u_admin"
```

To let MTN push final request-to-pay results back into Kora, set:

```powershell
$env:MOMO_CALLBACK_BASE_URL="https://your-integrations-host.example.com"
$env:MOMO_CALLBACK_TOKEN="replace-with-a-random-callback-token"
$env:MOMO_CALLBACK_AUTO_IMPORT="true"
$env:MOMO_CALLBACK_ACTOR_USER_ID="u_admin"
```

Kora uses `MOMO_CALLBACK_BASE_URL` to generate the `X-Callback-Url` header on outgoing request-to-pay calls. If `MOMO_CALLBACK_TOKEN` is set, Kora includes it in the generated callback URL and verifies it on receipt.

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

## Kora Operating Flow

The MoMo features Kora needs in the backend now work in this order:

1. Register a stored connector connection in the integrations service.
2. Use the MoMo payment endpoints with finance roles.
3. Resolve successful request-to-pay items into generic Kora events through import or auto-sync.
4. Query append-only request history for audit and troubleshooting.

Operational note: MTN MoMo request-to-pay requires `reference_id` to be a UUID v4. Kora now enforces that on the backend request-to-pay endpoint, and the `momo-kora` CLI generates a UUID v4 automatically when one is not supplied.

MTN's documentation also states that:
- the callback URL is supplied on each asynchronous `requesttopay` call through `X-Callback-Url`;
- sandbox and production callback URLs must use HTTPS;
- the wallet platform sends the callback only once, so polling remains the fallback safety net.

Source: [MTN MoMo callback documentation](https://momodeveloper.mtn.com/api-documentation/callback)

Register a MoMo connector connection once:

```http
POST /v1/integrations/connections
Content-Type: application/json

{
  "actor": {"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
  "connection": {
    "id": "conn_momo",
    "organization_id": "org_1",
    "kind": "MOMO",
    "display_name": "MTN MoMo",
    "secret_ref": "secret://org_1/momo",
    "active": true,
    "config": {"environment": "sandbox"}
  }
}
```

Query stored connections:

```http
POST /v1/integrations/connections/query
Content-Type: application/json

{
  "actor": {"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
  "organization_id": "org_1",
  "kind": "MOMO"
}
```

After that, MoMo import and sync endpoints can use `input.connection_id` without resending the full connection object when the connection is already stored in Kora.

## Backend Smoke Flow

Start the integrations server:

```powershell
go run ./services/integrations/cmd/server
```

Register the stored MoMo connection:

```powershell
go run ./services/integrations/cmd/momo-kora register-connection
```

Validate MTN sandbox auth through Kora:

```powershell
go run ./services/integrations/cmd/momo-kora validate-auth
```

Check the collection balance through Kora:

```powershell
go run ./services/integrations/cmd/momo-kora balance
```

Validate a sandbox payer number:

```powershell
go run ./services/integrations/cmd/momo-kora validate-account-holder --party-id "<msisdn>"
```

The sandbox flow verified in this repository on July 2, 2026 used `250780000000` with `EUR`.

Create a request-to-pay:

```powershell
go run ./services/integrations/cmd/momo-kora request-to-pay --amount "100" --external-id "invoice-100" --payer-msisdn "<msisdn>"
```

If you need to override the generated callback URL for a specific request:

```powershell
go run ./services/integrations/cmd/momo-kora request-to-pay --amount "100" --external-id "invoice-100" --payer-msisdn "<msisdn>" --callback-url "https://your-integrations-host.example.com/v1/integrations/momo/request-to-pay/callback/provider?organization_id=org_1&connection_id=conn_momo&reference_id=<uuid>"
```

Check request status:

```powershell
go run ./services/integrations/cmd/momo-kora request-status --reference-id "<reference-id>"
```

Show append-only request history:

```powershell
go run ./services/integrations/cmd/momo-kora request-history --reference-id "<reference-id>"
```

Import one successful request into the generic event pipeline:

```powershell
go run ./services/integrations/cmd/momo-kora import-request --reference-id "<reference-id>"
```

Or bulk sync statuses and auto-import successful items:

```powershell
go run ./services/integrations/cmd/momo-kora sync-statuses --reference-ids "<ref-1>,<ref-2>"
```

Run a realistic receivables simulation through Kora's live sandbox path:

```powershell
go run ./services/integrations/cmd/momo-kora simulate-receivables --count 20 --payer-msisdns "250780000000" --currency EUR --poll-seconds 1 --max-polls 4
```

This runner simulates twenty platform users across:
- invoice collection
- premium collection
- installment collection
- other receivable collection

It submits request-to-pay calls, polls for final status, imports successful results into Kora's generic event pipeline, and prints a machine-readable summary.

## What Still Remains

- Persist secrets in a real secrets manager instead of local environment variables.
- Validate the MoMo mapping against more real MTN exports beyond sandbox interactions.
- Use a deployed public callback URL in staging/production.
- Move runtime secrets and callback endpoints into production infrastructure management.
