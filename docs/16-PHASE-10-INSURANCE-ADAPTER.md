# Phase 10: Insurance Vertical Adapter

## Status

Implemented and verified against synthetic fixtures. Validation with anonymized records from an insurance design partner remains a product-readiness requirement.

## Architecture Boundary

Insurance concepts live in `verticals/insurance`; they are not ledger types.

| Insurance input | Generic Kora representation |
| --- | --- |
| Policy | Contract, external party, and optional premium invoice |
| Claim | Obligation with evidence and approval links |
| Broker | External party with role `BROKER` |
| Premium | Payment received linked to a contract |
| Claim payment | Payment sent linked to an obligation and approval |
| Commission | Payment sent with a commission category |
| Supplier payment | Payment sent with a supplier category |
| Bank charge | Payment sent with a bank-charge category |
| Refund | Payment received or sent according to direction |

The adapter sends versioned source records through the existing normalization service. The generic event ledger remains unchanged.

## Controls

- Every input requires tenant-scoped extraction provenance and evidence.
- Mapping IDs are deterministic across retries.
- Replayed records reuse normalized events instead of creating duplicates.
- Cross-tenant reconciliation and reporting are rejected.
- Outgoing values require the correct sign; refund direction must agree with its sign.
- Claims without an approval task are reported as unsupported.
- Claim payments can retain approval-task and ledger-posting links.
- Shared generic contract, obligation, or document links can reconcile sources that use different transaction references.
- Insurance mapping and event-link database records are append-only.

## API

- `POST /v1/insurance/map`
- `GET /v1/insurance/templates`
- `POST /v1/insurance/reconcile`
- `GET /healthz`

The reconcile response contains both the deterministic reconciliation result and the insurance exception report. The report exposes matched premiums, unmatched payments, unsupported claims, duplicate items, and linked approval tasks.

## Verification

Automated tests cover:

- policy, premium, claim, broker, commission, supplier, bank-charge, and refund mappings;
- premium-to-invoice and claim-to-payment reconciliation;
- stable replay behavior;
- human approval and segregation of duties before claim posting;
- balanced generic ledger posting with evidence;
- exception reporting and tenant isolation;
- strict HTTP request decoding and import templates.

Migration `014_insurance_vertical_adapter.sql` persists immutable mapping provenance and generic business-event links. Live migration verification requires access to the local Docker/PostgreSQL runtime.

## Remaining Product Validation

Before sales or production accuracy claims, obtain anonymized insurance exports and validate field mappings, exception categories, approval chains, reconciliation thresholds, and report usefulness with a finance lead or finance operator.
