# Phase 11: Reporting and ROI

## Status

Implemented and verified against synthetic event, workflow, reconciliation, ledger, and audit records. Finance-user review of the first report format and preferred ROI metrics remains required.

## Trust Model

The reporting service accepts source snapshots, not caller-computed report or ROI totals. It revalidates:

- report and ROI permissions;
- organization ownership of every event, task, posting, and audit entry;
- extraction provenance on events, tasks, matches, and exceptions;
- balanced posting groups and agreement with approved task amounts;
- workflow execution before monetary ROI is recognized;
- evidence continuity from event to task to posting;
- audit-entry integrity and action/resource links;
- reconciliation state for duplicate and unsupported-payment outcomes;
- versioned benchmarks and measured timestamps for time-saved outcomes.

One source event can contribute to ROI only once. Database uniqueness enforces this across saved reports, and the in-memory engine rejects it before persistence.

## Outputs

- currency-level ledger debit and credit summaries;
- approval-state counts;
- evidence-backed reconciliation exceptions;
- verified audit-entry count;
- ROI grouped by impact type and currency;
- source event IDs and evidence for every ROI metric.

Supported impact types are money recovered, duplicate payment avoided, unsupported payment caught, late invoice collected, hours saved, and missing document fixed.

## API And Contracts

- `POST /v1/reports/generate`
- `GET /healthz`
- `proto/reporting/reporting.proto`
- `deploy/migrations/015_reporting_roi.sql`

Report and ROI snapshots are append-only. Monetary values are derived from trusted postings or reconciliation evidence; there is no API field for submitting a claimed ROI amount.

## Verification

Tests cover valid report generation, balanced ledger reconciliation, permission boundaries, tenant isolation, audit integrity, duplicate detection, evidence-derived monetary ROI, source-event deduplication, malformed requests, and unauthorized ROI access.

## Remaining Product Validation

Review report layout, terminology, and priority metrics with a finance lead or finance operator. PDF and Excel exports remain intentionally deferred as specified in the canonical build plan.
