# Production Readiness Action Plan

## Executive Summary

This document outlines the work required to bring Kora from its current late-development/early-beta state to production readiness.

## Current Status Assessment

### ✅ Completed
- Core backend architecture and services
- Database schemas for all major domains
- Trust spine (identity, RBAC, tenant isolation, audit)
- Reconciliation engine with confidence scoring
- Consent management and Credit Passport
- Agent framework (deterministic analytics)
- Integration connector framework
- Basic observability (health checks, metrics, structured logging)
- Backup/restore scripts

### ⚠️ Partially Complete
- **Frontend clients**: UI components built but rely heavily on seed/static data
- **Backend APIs**: Many endpoints return demo data when DB is empty
- **Operational procedures**: Basic monitoring exists but not configured for production
- **Security**: Internal controls implemented but no external review

### ❌ Not Started
- Live third-party integrations (MoMo, banks, accounting systems)
- External security audit
- Load testing on production-sized datasets
- Staging/production environment provisioning
- Compliance checklist validation

## Priority Work Streams

### Stream 1: Remove Static/Seed Data Dependency (HIGH PRIORITY)

**Goal**: Ensure all frontend data comes from backend APIs, which in turn query the database.

#### Backend Changes Required:
1. **Gateway Service** (`services/gateway/internal/httpapi/`)
   - Modify dashboard endpoints to return empty states instead of demo data when DB has no records
   - Ensure all query functions return proper empty arrays/objects, not hardcoded demos
   - Add proper error handling for missing data scenarios

2. **Demo Package** (`services/gateway/internal/demo/`)
   - Keep demo data for development/testing only
   - Add feature flag or config to disable demo data in production
   - Create "empty state" responses for all dashboard views

#### Frontend Changes Required:
1. **Remove Seed Data Usage** (`frontend/shared/src/seed/`)
   - Audit all 138 files using seed data
   - Replace seed imports with API calls
   - Update stores to handle empty states gracefully
   - Remove seed folder entirely once migration complete

2. **API Integration** (`frontend/shared/src/api/`)
   - Ensure all pages use API hooks (React Query)
   - Add loading states and error boundaries
   - Implement proper empty state UIs
   - Add retry logic for failed API calls

3. **State Management** (`frontend/shared/src/state/`)
   - Migrate from seed-based stores to API-driven stores
   - Add caching strategies
   - Implement optimistic updates where appropriate

### Stream 2: Complete Backend Services (HIGH PRIORITY)

**Goal**: Ensure all backend services are fully functional and return real data.

#### Services to Verify/Complete:
1. **Identity Service** - User management, authentication
2. **Ingestion Service** - Document intake, batch processing
3. **Normalization Service** - Data standardization
4. **Reconciliation Service** - Matching engine
5. **Workflow Service** - Approval flows
6. **Reporting Service** - Analytics and reports
7. **Consent Service** - Data sharing permissions
8. **Ledger Service** - Double-entry bookkeeping

#### Actions:
- Review each service for incomplete handlers
- Add integration tests for critical paths
- Ensure proper error handling and logging
- Verify database migrations are complete

### Stream 3: Operational Procedures & Monitoring (MEDIUM PRIORITY)

**Goal**: Establish production-grade monitoring, alerting, and operational procedures.

#### Monitoring Setup:
1. **Metrics Collection**
   - Configure Prometheus/Grafana stack
   - Define SLOs for critical services
   - Set up custom business metrics

2. **Logging**
   - Centralized log aggregation (ELK/Loki)
   - Structured logging across all services
   - Log retention policies

3. **Alerting**
   - Define alert thresholds
   - Configure notification channels (email, Slack, PagerDuty)
   - Create runbooks for common alerts

4. **Health Checks**
   - Deep health checks with dependency verification
   - Synthetic monitoring for critical user journeys
   - Automated incident response

#### Operational Documentation:
- Deployment procedures
- Rollback procedures
- Disaster recovery plan
- On-call rotation schedule
- Incident response playbook

### Stream 4: Security & Compliance (MEDIUM PRIORITY)

**Goal**: Achieve production security posture.

#### Actions:
1. **Internal Security Review**
   - Penetration testing on staging environment
   - Vulnerability scanning
   - Dependency audit

2. **Compliance Checklist**
   - Data protection (GDPR, local regulations)
   - Financial data handling requirements
   - Audit trail completeness verification
   - Access control review

3. **External Audit** (Pre-production)
   - Third-party security assessment
   - Compliance certification if required

### Stream 5: Environment & Deployment (MEDIUM PRIORITY)

**Goal**: Establish staging and production environments.

#### Infrastructure:
1. **Environment Separation**
   - Development → Staging → Production pipeline
   - Isolated databases per environment
   - Separate secrets management

2. **Secrets Management**
   - Migrate from environment variables to secrets manager
   - Rotate all credentials
   - Implement least-privilege access

3. **CI/CD Pipeline**
   - Automated testing gates
   - Blue-green or canary deployments
   - Automated rollback capabilities

### Stream 6: Third-Party Integrations (LOW PRIORITY for MVP)

**Goal**: Framework ready, live connections post-MVP.

**Note**: As specified, third-party integrations (MoMo, banks, accounting) will be added after core system is working. The framework is already in place.

## Implementation Phases

### Phase 1: Data Flow Cleanup (Weeks 1-2)
- [ ] Backend: Remove demo data fallbacks, return proper empty states
- [ ] Frontend: Replace seed data with API calls for critical paths
- [ ] Testing: Verify end-to-end data flow with empty database

### Phase 2: Service Completion (Weeks 3-4)
- [ ] Audit all services for incomplete functionality
- [ ] Add missing database queries and handlers
- [ ] Implement proper error handling
- [ ] Write integration tests

### Phase 3: Frontend Polish (Weeks 5-6)
- [ ] Complete API integration for all pages
- [ ] Remove seed data folder
- [ ] Add loading/error/empty states
- [ ] Performance optimization

### Phase 4: Operational Readiness (Weeks 7-8)
- [ ] Set up monitoring stack
- [ ] Configure alerting
- [ ] Write operational procedures
- [ ] Conduct disaster recovery drill

### Phase 5: Security & Compliance (Weeks 9-10)
- [ ] Internal security review
- [ ] Compliance checklist completion
- [ ] External audit (if budget allows)
- [ ] Remediate findings

### Phase 6: Production Deployment (Week 11+)
- [ ] Provision production infrastructure
- [ ] Migrate to secrets manager
- [ ] Deploy to staging for final validation
- [ ] Production go-live

## Success Criteria

### Technical Criteria
- [ ] Zero seed/static data in production frontend
- [ ] All API endpoints return real database data
- [ ] 95%+ test coverage on critical paths
- [ ] All services pass load testing at expected scale
- [ ] Monitoring and alerting operational

### Operational Criteria
- [ ] Documented deployment procedures
- [ ] Defined on-call rotation
- [ ] Incident response playbook tested
- [ ] Backup/restore verified on staging

### Security Criteria
- [ ] No critical vulnerabilities in scan
- [ ] Access controls verified
- [ ] Audit trails complete and immutable
- [ ] Compliance checklist signed off

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Static data remains in production | High | Medium | Code review checklist, automated tests |
| Incomplete service functionality | High | Medium | Service audit, integration testing |
| Monitoring gaps | Medium | High | Use established templates, external review |
| Security vulnerabilities | High | Medium | Early scanning, phased rollout |
| Third-party API delays | Low | High | Defer to post-MVP, use framework |

## Next Steps

1. **Immediate**: Start Phase 1 - Remove static data dependencies
2. **This Week**: Complete backend demo data removal
3. **Next Week**: Frontend API integration for critical paths
4. **Ongoing**: Daily progress reviews, adjust plan as needed

---

*Last Updated: $(date)*
*Owner: Development Team*
*Review Cadence: Weekly*
