# Phase 14: Finance Intelligence, Collections, Contracts

## Status

Implemented and verified against synthetic finance, invoice, contract, relationship, and agent fixtures. Finance-user validation is still required before production use, especially reminder tone, escalation thresholds, and contract obligation wording.

## Finance Analytics

`libs/financeanalytics` generates deterministic cashflow, P&L, margin, and receivables-aging reports from generic Kora events and approved ledger postings. It rejects cross-tenant records, fabricated reconciliation evidence, mixed currencies without exchange handling, invalid dates, and unbalanced postings.

P&L is derived from ledger accounts. Expense classification is tenant-configurable at input level so direct costs and operating expenses are separated without hardcoding a vertical.

## Collections

`libs/collections` turns active unmatched overdue invoice events into collection cases. Cases include amount, due date, days overdue, suggested tone, draft message, and evidence. Human users with `collections:send` may send reminders; agents can only draft.

The `collections_agent` produces draft-only reminder suggestions from an existing deterministic collection case. It refuses to continue without invoice evidence and case details.

## Contracts And Obligations

`libs/contracts` analyzes generic `CONTRACT_SIGNED`, `OBLIGATION_CREATED`, `PAYMENT_SENT`, and `PAYMENT_RECEIVED` events. It extracts contract records, links obligations through `contract_link`, generates renewal alerts from configured alert windows, and flags payments without contract, obligation, PO, or document links.

This keeps contracts generic. Insurance policies, supplier agreements, school contracts, clinic service agreements, and SaaS subscriptions can all map through the same event model.

## Relationship Graph

`libs/relationships` builds an evidence-backed graph from resolved entities and business events. Edges connect external parties, events, contracts, invoices, payments, obligations, and other related entities using generic relationship metadata.

## Agent Boundary

`finance_intelligence_agent` explains an existing deterministic finance analytics report. `collections_agent` drafts reminder copy. Neither agent can post ledger entries, approve financial actions, send reminders, move money, or invent unsupported facts.

## API And Persistence

- `POST /v1/finance-analytics/generate`
- `POST /v1/collections/cases`
- `POST /v1/collections/send`
- `POST /v1/contracts/analyze`
- `POST /v1/relationships/graph`
- `proto/financeops/finance_ops.proto`
- `deploy/migrations/018_finance_collections_contracts.sql`

Persistence includes immutable analytics snapshots, report evidence, collection cases, reminder events, contract records, obligations, renewal alerts, payment-contract mismatch flags, and relationship graph edges.

## Verification

Tests cover cashflow, P&L, margin, aging, deterministic report IDs, overdue cases, human-only reminder sending, renewal alerts, obligations, payment-contract mismatch detection, relationship graph construction, cross-tenant rejection, permission checks, agent refusal, and agent guardrails.
