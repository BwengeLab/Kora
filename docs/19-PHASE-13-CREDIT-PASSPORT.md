# Phase 13: Credit Passport

## Status

Implemented and verified against synthetic ledger, cashflow, invoice, obligation, reconciliation, risk, consent, and agent fixtures. Review with a lender, MFI, SACCO, or credit advisor remains required before production use.

## Deterministic Passport

The Go service generates a reproducible passport from generic Kora records. It requires verified cashflow events, at least one balanced approved ledger posting, one currency unless verified exchange rates are supplied, source-linked reconciliation results, and evidence-backed risk flags.

Sections include cashflow, payment discipline, receivables, obligations, account balances, risk flags, and affordability. Reversed or superseded events are excluded from active calculations. Ledger balances retain posting evidence.

## Affordability

Affordability is calculated from a versioned tenant policy:

1. Average verified monthly net cashflow is calculated over observed calendar months.
2. The configured maximum debt-service percentage is applied.
3. Existing monthly obligations are deducted.
4. A configured stress buffer is applied.
5. Principal is estimated using term and annual interest assumptions.

The output lists every assumption and states that the estimate is decision support, not a lending decision. The policy itself carries evidence.

## Consent-Controlled Sharing

External sharing calls the Phase 12 consent gate once per requested category. Only authorized sections are returned. A lender cannot obtain receivables, ledger balances, risks, or other categories that are absent from the grant. Every allowed and denied category request is logged.

## Agent Boundary

`credit_passport_agent` explains an existing deterministic result. It cannot calculate a new amount, approve credit, disburse funds, or continue without evidence, a passport ID, policy metadata, and assumptions. It runs through the common idempotent, grounded agent runtime and has an evaluation case.

## API And Persistence

- `POST /v1/credit-passports`
- `POST /v1/credit-passports/{id}/read`
- `POST /v1/credit-passports/{id}/share`
- `proto/creditpassport/credit_passport.proto`
- `deploy/migrations/017_credit_passport.sql`

Persistence includes generic risk flags, versioned affordability policies, immutable passport snapshots, evidence links, and risk links.

## Verification

Tests cover reproducibility across source ordering, cashflow and affordability math, payment timing, receivables, obligations, balanced ledger controls, multi-currency refusal, fabricated risk evidence, generation/read permissions, consent-filtered sharing, audited denials, API replay behavior, agent refusal, runtime grounding, and agent idempotency.
