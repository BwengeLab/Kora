# Kora Live AI Runtime

Kora's UI agent execution path is:

`Web/Desktop -> Go Gateway -> Python Agent Runtime -> deterministic analysis -> Groq explanation -> validated AgentOutput -> PostgreSQL -> Gateway/UI`

## Runtime guarantees

- The gateway returns `503` when the runtime or external model does not complete.
- Agent cards begin in `not run` state and do not display seeded findings.
- Deterministic analysis remains authoritative; Groq explains its sanitized result.
- Sensitive context keys are removed before an external model request.
- Agents cannot approve, post, transfer, pay, reverse, or disburse funds.
- Every output retains evidence provenance and tenant/user identity.
- Completed runs record route, provider status, model, token usage, run ID, and redacted fields.
- The UI displays the model and only marks a card live after a validated runtime completion.

## Configuration

Required local variables are documented in `.env.example`:

- `KORA_AGENT_RUNTIME_URL`
- `KORA_AGENT_RUNTIME_TOKEN`
- `KORA_JWT_SECRET`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_BASE_URL`

The agent runtime receives Groq configuration through Docker Compose. Production must use a shared persistent identity store; development identities must exist in PostgreSQL before persisted agent runs are accepted.

## Verification

Run:

```powershell
python -m unittest discover -s agents -p "*_test.py"
go test ./...
pnpm --dir frontend/shared test
pnpm --dir frontend typecheck
pnpm --dir frontend build:web
```

An end-to-end acceptance run must additionally verify all ten `/api/agents/run/{id}` calls return cards containing `runtimeRunId` and `modelName`, and that `agent_runs` records `external_model=true` with `model_status=completed`.
