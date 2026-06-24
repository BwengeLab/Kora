# Phase 12: Consent and Data Sharing

## Status

Implemented and verified against automated scope, expiry, monitoring, revocation, authorization, and audit-log tests.

## Grant Model

Each grant identifies the organization, external user, recipient party, allowed data categories, shareable read permissions, data period, expiry, purpose, monitoring choice, approved task, consenting user, and evidence.

Grant creation requires the `consent:manage` permission and a completed `grant_external_access` approval with segregation of duties. Grant scope is immutable. Revocation is evidence-backed, one-way, and effective on the next authorization check.

## Partner Access Gate

`AuthorizeAndLog` is the mandatory gate before a partner API returns data. It verifies:

- active, unexpired, unrevoked consent;
- exact external recipient identity;
- shareable read permission;
- allowed data category;
- requested historical period;
- explicit permission for ongoing monitoring;
- tenant boundary and resource identity.

Both allowed and denied attempts are logged. Unknown or revoked grants therefore remain visible to audit reviewers.

## Initial Templates

- Lender credit review
- External audit
- Financial advisor

Templates are starting points only; the final saved grant remains explicit and evidence-backed.

## API And Persistence

- `POST /v1/consent/grants`
- `POST /v1/consent/grants/{id}/revoke`
- `POST /v1/consent/authorize`
- `POST /v1/consent/access-logs/query`
- `GET /v1/consent/templates`
- `proto/consent/consent.proto`
- `deploy/migrations/016_consent_data_sharing.sql`

The migration extends existing external access grants, freezes scope after creation, and adds append-only grant events and external access logs.

## Verification

Tests cover scope enforcement, period boundaries, monitoring, expiry, immediate revocation, independent approval, prohibited mutation permissions, missing evidence, initial templates, strict HTTP decoding, lifecycle endpoints, and logged denials.
