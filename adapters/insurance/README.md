# Insurance Adapter

The insurance adapter is the first Kora vertical. It must not change the generic core ledger model.

## Mapping

- Policy links to ExternalParty, Contract, Invoice, Payment, and BusinessEvent.
- Claim links to ApprovalTask, Payment, Evidence, and LedgerEntry.
- Broker is an ExternalParty with role `BROKER`.
- Premium is an event category, invoice category, or payment allocation category.

## Boundary

Insurance-specific fields belong here or in adapter metadata. They only move into core when the same concept is needed across multiple verticals.

