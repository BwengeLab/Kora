# Kora Core Domain

The core domain stays generic. Vertical adapters may add terminology, but they must map into these objects instead of changing the core ledger model.

## Generic Objects

- Organization
- User
- ExternalParty
- Account
- Transaction
- Payment
- Invoice
- Bill
- Receipt
- Contract
- Obligation
- Document
- BusinessEvent
- ApprovalTask
- LedgerEntry
- RiskFlag
- Evidence
- Report

## Insurance Adapter Mapping

- Policy maps to a vertical object linked to customer, contract, invoice/payment, and business event.
- Claim maps to a vertical object linked to approval task, payment, evidence, and ledger entry.
- Broker maps to ExternalParty with role `BROKER`.
- Premium maps to a business event category, invoice category, or payment allocation category.

Insurance-specific fields must stay in adapter metadata or adapter services unless they become broadly useful across other verticals.

## Correction Rule

Business events are append-only. Mistakes are corrected through linked reversal, adjustment, replacement, or evidence-addition events.

Minimum correction event vocabulary:

- EVENT_CREATED
- EVENT_REVERSED
- EVENT_ADJUSTED
- MATCH_APPROVED
- MATCH_REJECTED
- POSTING_CREATED
- POSTING_REVERSED
- DOCUMENT_REPLACED
- EVIDENCE_ADDED

