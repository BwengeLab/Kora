# Production Readiness Implementation Plan

## Current State Analysis

### Backend Issues Identified:
1. **Gateway Service** (`services/gateway/internal/httpapi/server.go` - 5268 lines)
   - Uses demo data from `services/gateway/internal/demo/` package (14 files, ~2794 lines)
   - Dashboard endpoints return hardcoded demo data when DB is empty
   - Need to modify to return proper empty states

2. **Demo Data Package** (`services/gateway/internal/demo/`)
   - Contains static data for all dashboard views
   - Should only be used in development, not production

### Frontend Issues Identified:
1. **Seed Data Folder** (`frontend/shared/src/seed/` - 40+ files)
   - All modules import seed data as fallbacks
   - Components use seed data as default props

2. **Modules Using Seed Data** (138 files found)
   - `home-auditor/*` - ControlHealthCard, RiskStatCards, SodViolationsCard, MissingDocsCard
   - `audit-investigations/AuditInvestigations.tsx` - Falls back to seed data
   - Similar patterns across all role dashboards

## Implementation Strategy

### Phase 1: Backend - Remove Demo Data Fallbacks (Priority: HIGH)
**Goal**: Backend returns empty states instead of demo data

#### Changes Required:
1. Modify gateway HTTP handlers to:
   - Query database first
   - Return empty arrays/objects if no data exists
   - Only use demo data in development mode with feature flag

2. Files to modify:
   - `services/gateway/internal/httpapi/server.go`
   - Add config flag: `ENABLE_DEMO_DATA` (default: false in production)

### Phase 2: Frontend - Replace Seed Data with API Calls (Priority: HIGH)
**Goal**: All frontend data comes from API calls, no static fallbacks

#### Changes Required:
1. **Audit each module** using seed data
2. **Replace imports** with API hooks
3. **Add loading/error/empty states**
4. **Remove seed folder** once complete

#### Priority Modules:
1. `home-auditor/*` - Auditor dashboard cards
2. `audit-investigations/*` - Audit trail view
3. `home-owner/*` - Owner dashboard
4. `home-admin/*` - Admin dashboard
5. `home-finance-lead/*` - Finance lead views

### Phase 3: API Layer Enhancement (Priority: MEDIUM)
**Goal**: Robust API client with proper error handling

#### Changes Required:
1. Add retry logic to API client
2. Implement proper TypeScript types for all responses
3. Add empty state handlers
4. Create React Query hooks for all endpoints

### Phase 4: Testing & Validation (Priority: MEDIUM)
**Goal**: Verify end-to-end data flow

#### Actions:
1. Test with empty database
2. Verify all pages show appropriate empty states
3. Test data creation → display flow
4. Integration tests for critical paths

## Success Criteria

✅ **Backend**:
- [ ] No hardcoded demo data returned in production
- [ ] All endpoints return proper empty states
- [ ] Feature flag controls demo data in dev only

✅ **Frontend**:
- [ ] Zero imports from `frontend/shared/src/seed/`
- [ ] All components use API hooks
- [ ] Proper loading/error/empty states
- [ ] Seed folder deleted

✅ **Integration**:
- [ ] End-to-end data flow works
- [ ] Empty database handled gracefully
- [ ] Real data displays correctly

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Backend Cleanup | 3-4 days | Modified gateway handlers, config flags |
| 2. Frontend Migration | 5-7 days | API-integrated modules, removed seed imports |
| 3. API Enhancement | 2-3 days | Enhanced client, TypeScript types |
| 4. Testing | 2-3 days | Test suite, validation reports |
| **Total** | **12-17 days** | **Production-ready data flow** |

## Next Steps

1. **Immediate**: Start with backend gateway modifications
2. **Parallel**: Begin frontend audit of seed data usage
3. **Daily**: Review progress, adjust priorities
4. **End of Phase 1**: Validate backend returns empty states
5. **End of Phase 2**: Remove seed folder entirely

---

*Created: Based on project analysis*
*Status: Ready to implement*
