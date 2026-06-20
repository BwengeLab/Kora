# Kora Generic Business Event Taxonomy

> **Phase 5 contract.** Core business events are generic and append-only. Vertical terms are represented as categories and adapter metadata, not new core event types.

## Event Types

| Event type | Meaning | Typical source records |
|---|---|---|
| `TRANSACTION_OBSERVED` | A financial movement was observed but not yet classified as a payment | Bank or wallet transaction |
| `PAYMENT_RECEIVED` | Money was received | Customer payment, premium receipt |
| `PAYMENT_SENT` | Money was sent | Supplier payment, refund |
| `INVOICE_ISSUED` | A receivable invoice was issued | Sales invoice |
| `BILL_RECEIVED` | A payable bill was received | Supplier bill |
| `RECEIPT_RECORDED` | A receipt was captured as evidence | Purchase or payment receipt |
| `CONTRACT_SIGNED` | A contract became effective | Supplier, customer, employment, or service contract |
| `OBLIGATION_CREATED` | A financial or contractual obligation arose | Claim obligation, repayment obligation |
| `DOCUMENT_MISSING` | Required evidence is missing | Missing receipt, invoice, contract, or approval |
| `APPROVAL_REQUIRED` | Policy requires a human approval task | High-value payment or exception |

## Raw Record Mapping

| Extracted record type | Core event | Metadata |
|---|---|---|
| `transaction` | `TRANSACTION_OBSERVED` | Original fields retained |
| Positive `payment` | `PAYMENT_RECEIVED` | Original fields retained |
| Negative `payment` | `PAYMENT_SENT` | Original fields retained |
| `invoice` | `INVOICE_ISSUED` | Original fields retained |
| `bill` | `BILL_RECEIVED` | Original fields retained |
| `receipt` | `RECEIPT_RECORDED` | Original fields retained |
| `contract` | `CONTRACT_SIGNED` | Original fields retained |
| `premium` | `PAYMENT_RECEIVED` | `category=premium` |
| `claim` | `OBLIGATION_CREATED` | `category=claim` |

`PREMIUM` and `CLAIM` are not core event types. The insurance adapter may link their vertical objects to these generic events later.

## Resolved Entity Types

`EXTERNAL_PARTY`, `ACCOUNT`, `DOCUMENT`, `CONTRACT`, `INVOICE`, `BILL`, `RECEIPT`, `PAYMENT`, `TRANSACTION`, and `OBLIGATION`.

Resolution is tenant-scoped and deterministic. Each entity records the resolution method and confidence. Tax IDs, registration numbers, account numbers, and external references are preferred over normalized names.

## Trust Rules

- Records carrying `incomplete`, `duplicate-risk`, `low-confidence`, `needs-review`, or `source-conflict` do not become trusted events.
- Normalization is replay-safe by document, extraction version, source record, and tenant.
- Every event carries versioned source provenance and evidence.
- Stored business events remain `ACTIVE`; effective reversal, adjustment, or supersession state is derived from correction events.
- Corrections never update or delete the original event.
