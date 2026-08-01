# Production Data Migration Plan - EXECUTION TRACKER

## Status: STARTING PHASE 1 - Backend Cleanup

## Overview
This document tracks the migration from demo/seed data to production-ready database-driven data flow.

## Phase 1: Backend Cleanup (Priority: CRITICAL) - IN PROGRESS

### 1.1 Handlers Already Using Database Queries ✅
These handlers have DB query integration with demo fallback:
- ✅ `/api/home/owner-dashboard` - Uses `queryOwnerDashboard()` 
- ✅ `/api/home/admin-dashboard` - Uses `queryAdminDashboard()`
- ✅ `/api/collections/overdue` - Uses `queryCollectionsOverdue()`
- ✅ `/api/workflow/snapshot` - Uses `queryWorkflowSnapshot()` (needs verification)

### 1.2 Handlers Needing Database Integration ❌
These handlers need query functions and DB integration:
- ❌ `/api/claims/workspace` - Currently returns `s.claimsState` (demo data)
- ❌ `/api/consent/grants` - Currently returns `s.consentState` (demo data)
- ❌ `/api/relationships/overview` - Currently returns `s.relationships` (demo data)
- ❌ `/api/agents/overview` - Currently returns `s.agentsState` (demo data)
- ❌ `/api/home/operator-dashboard` - Needs `queryOperatorDashboard()` integration
- ❌ `/api/home/auditor-dashboard` - Needs query function
- ❌ `/api/ledger/cashflow` - Needs query function
- ❌ `/api/reports/catalog` - Needs query function
- ❌ `/api/settings/users` - Needs query function
- ❌ `/api/settings/approval-rules` - Needs query function

### 1.3 Database Tables Available
From migrations, these tables exist:
- ✅ `credit_passports` - For credit scores
- ✅ `documents` - For recent documents  
- ✅ `users` - For user management
- ✅ `approval_tasks` - For workflow approvals
- ✅ `match_candidates` - For reconciliation
- ✅ `ledger_entries` - For cash flow
- ✅ `collection_cases` - For collections
- ✅ `contract_records`, `contract_obligations` - For contracts
- ✅ `risk_flags` - For risk data
- ✅ `resolved_entities` - For relationships/parties
- ✅ `consent_grants` - For consent management
- ✅ `business_events` - For events data
- ✅ `ingestion_batches` - For data intake

### 1.4 Missing Database Query Functions
Need to implement:
1. `queryClaimsWorkspace(orgID)` - Claims data
2. `queryConsentGrants(orgID)` - Consent grants  
3. `queryRelationshipsOverview(orgID)` - Relationships/parties
4. `queryAgentsOverview(orgID)` - Agent status/activity
5. `queryAuditorDashboard(orgID)` - Audit findings
6. `queryLedgerCashflow(orgID)` - Cash movements
7. `queryReportsCatalog(orgID)` - Available reports
8. `queryApprovalRules(orgID)` - Approval policies

## Implementation Priority

### Week 1 - Critical APIs
**Day 1-2**: Consent & Claims
- Implement `queryConsentGrants()` 
- Implement `queryClaimsWorkspace()`
- Update handlers to use queries

**Day 3-4**: Relationships & Agents  
- Implement `queryRelationshipsOverview()`
- Implement `queryAgentsOverview()`
- Update handlers

**Day 5**: Testing
- Test all updated endpoints
- Verify empty state handling

### Week 2 - Remaining APIs
**Day 1-2**: Dashboards
- Complete `queryOperatorDashboard()`
- Implement `queryAuditorDashboard()`
- Implement remaining dashboard queries

**Day 3-4**: Settings & Configuration
- Implement settings queries
- Update settings handlers

**Day 5**: Integration Testing
- End-to-end testing
- Bug fixes

## Phase 2: Frontend Migration (START AFTER PHASE 1 COMPLETE)

### 2.1 Components to Update
Priority order based on usage:
1. Home dashboards (owner, admin, operator, auditor)
2. Workflow & approvals
3. Collections management
4. Claims workspace
5. Consent management
6. Relationships
7. Settings pages
8. Reports

### 2.2 Seed Files to Remove
After migration complete:
- `/workspace/frontend/shared/src/seed/` - Delete entire directory

## Success Metrics

✅ All API handlers use database queries
✅ No direct demo data returns in production code
✅ Proper error handling for missing data
✅ Loading states in frontend during API calls
✅ Empty states display correctly
✅ All user workflows functional

## Rollback Strategy

If issues occur:
1. Keep demo fallback temporarily
2. Add feature flag to toggle DB vs demo mode
3. Monitor error rates and performance
4. Gradual rollout by endpoint
