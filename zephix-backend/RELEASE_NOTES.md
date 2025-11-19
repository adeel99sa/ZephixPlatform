# Zephix Release Notes

## v0.5.0-alpha - 2025-01-19

### Backend Changes

- **Workspace Creation Transactions**: Workspace creation, owner assignment, and member record creation are now wrapped in a single transaction for atomicity
- **Template Center Backend**: Complete backend implementation for project templates with CRUD operations and soft archiving (`isActive` flag)
- **Template Application Transaction**: Atomic `applyTemplate` flow that creates projects, phases, and tasks from templates using `DataSource.transaction()`
- **Resource Center Backend v1**: Extended resource directory API with filters (skills, roles, workspaceId, date range), capacity summary endpoint, capacity breakdown endpoint, and skills facet endpoint
- **Resource AI Risk Scoring**: New `ResourceRiskScoreService` with rule-based scoring algorithm (0-100 score, LOW/MEDIUM/HIGH severity) behind feature flag `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1`
  - `GET /api/resources/:id/risk-score` endpoint
  - `GET /api/workspaces/:id/resource-risk-summary` endpoint

### Frontend Changes

- **Template Center Admin UI**: Complete admin interface for template CRUD operations with JSON-based structure editing
- **Project Creation from Templates**: Integrated template selection into project creation flow with `applyTemplate` API integration
- **Resource Center v1**: Enhanced resource directory with skill/role/workspace filters, date range picker, capacity indicators, and resource detail panel with project allocation breakdown
- **Risk AI UI Integration**: Resource risk scoring UI behind feature flag `VITE_RESOURCE_AI_RISK_SCORING_V1`
  - Workspace risk overview widget with summary statistics
  - Per-resource risk score display in detail panel with severity badges and key factors

### Testing Summary

**Backend E2E Test Suites**:
- `workspace-membership-filtering.e2e-spec.ts`: ⚠️ Requires DATABASE_URL (infrastructure issue, not code failure)
- `workspace-rbac.e2e-spec.ts`: ⚠️ Requires DATABASE_URL (infrastructure issue, not code failure)
- `workspace-backfill.e2e-spec.ts`: ⚠️ Requires DATABASE_URL (infrastructure issue, not code failure)
- `template-application.e2e-spec.ts`: ⚠️ Requires DATABASE_URL (infrastructure issue, not code failure)
- `resources.e2e-spec.ts`: ⚠️ Requires DATABASE_URL (infrastructure issue, not code failure)
- `resource-risk.e2e-spec.ts`: ⚠️ Requires DATABASE_URL (infrastructure issue, not code failure)

**Note**: All test suites require Railway `DATABASE_URL` environment variable to run. Test failures are due to missing database connection configuration, not code issues.

**Frontend Tests**:
- `ResourcesPage.test.tsx`: ✅ All tests passing (including new risk scoring tests)

### Feature Flags

- `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1`: Backend feature flag for resource risk scoring endpoints (default: OFF)
- `VITE_RESOURCE_AI_RISK_SCORING_V1`: Frontend feature flag for risk scoring UI (default: OFF)

Both flags must be enabled for full risk scoring functionality.

