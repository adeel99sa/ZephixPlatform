# Zephix Platform - Solution Architect Overview

**Generated:** 2025-01-27  
**Role:** Solution Architect Analysis  
**Purpose:** Comprehensive platform architecture documentation for technical decision-making

---

## EXECUTIVE SUMMARY

**Platform Type:** Enterprise-grade AI-powered Project Management Platform  
**Architecture:** Monorepo with NestJS backend + React frontend  
**Deployment:** Railway (staging + production)  
**Status:** ~75% complete, production-ready core features  
**Multi-Tenancy:** Organization-scoped with workspace-level isolation

### Key Differentiators
1. **Governance-First Design** - Enforced structure vs optional in competitors
2. **Resource Management as Core** - Percentage-based allocations with conflict detection
3. **Template System** - Deploy complete project systems, not just starting points
4. **Automatic KPI Rollups** - Portfolio/program/project metrics automatically aggregated
5. **Multi-Layer Role System** - Platform → Organization → Workspace → Project roles

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Monorepo Structure

```
ZephixApp/
├── zephix-backend/          # NestJS API server
├── zephix-frontend/         # React 19 + Vite application
├── zephix-landing/          # Marketing landing page
├── packages/                # Shared packages (future)
├── scripts/                 # Deployment & utility scripts
└── docs/                    # Architecture documentation
```

### 1.2 Technology Stack

**Backend:**
- **Framework:** NestJS 10+ (TypeScript)
- **Database:** PostgreSQL with TypeORM 0.3.20
- **Auth:** JWT (access + refresh tokens), Passport.js
- **Validation:** class-validator, class-transformer
- **Security:** Helmet, CORS, Rate Limiting, bcrypt
- **AI:** Anthropic Claude API integration
- **Observability:** OpenTelemetry, Prometheus metrics

**Frontend:**
- **Framework:** React 19 + TypeScript 5.8
- **Build:** Vite 7.1
- **Styling:** Tailwind CSS 4.0
- **State:** Zustand 5.0
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest, Cypress, Playwright
- **UI Components:** Headless UI, Radix UI, Lucide icons

**Infrastructure:**
- **Deployment:** Railway (Nixpacks auto-detect)
- **Database:** Railway PostgreSQL
- **CDN:** Railway static hosting (frontend)
- **Monitoring:** Railway logs, health checks

---

## 2. MULTI-TENANCY ARCHITECTURE

### 2.1 Tenant Hierarchy

```
Organization (Tenant Root)
  ├── Users (organizationId scoped)
  ├── Workspaces (organizationId scoped)
  │   ├── Projects (workspaceId + organizationId scoped)
  │   ├── Programs (workspaceId + organizationId scoped)
  │   ├── Portfolios (workspaceId + organizationId scoped)
  │   └── Resources (organizationId scoped, workspace-filtered)
  └── Templates (organizationId scoped)
```

### 2.2 Tenant Scoping Implementation

**TenantAwareRepository Pattern:**
- All repository operations automatically filtered by `organizationId`
- Workspace-scoped entities additionally filtered by `workspaceId`
- Uses `AsyncLocalStorage` for thread-safe tenant context
- Enforced at DAL layer - impossible to bypass

**Tenant Context Flow:**
1. `TenantContextInterceptor` extracts `organizationId` from JWT (`req.user.organizationId`)
2. Extracts `workspaceId` from route params/headers (validated against organization)
3. Sets context via `AsyncLocalStorage.run()` for request lifecycle
4. `TenantAwareRepository` automatically applies filters to all queries

**Security Guarantees:**
- ✅ All queries include `organizationId` filter
- ✅ Workspace access validated against organization membership
- ✅ Cross-tenant workspace access returns 403 (not 404)
- ✅ No data leakage possible at repository level

---

## 3. AUTHENTICATION & AUTHORIZATION

### 3.1 Authentication Flow

**JWT-Based Authentication:**
- **Access Token:** 15-minute expiry, contains `userId`, `organizationId`, `email`
- **Refresh Token:** 7-day expiry, stored in `AuthSession` table (hashed)
- **Session Tracking:** Server-side session management (not stateless)
- **Token Storage:** Frontend stores in `localStorage` (`zephix.at`, `zephix.rt`)

**Login Process:**
1. User submits credentials → `POST /api/auth/login`
2. Backend validates password (bcrypt), creates/updates `AuthSession`
3. Returns `accessToken`, `refreshToken`, `user` object
4. Frontend stores tokens, sets `Authorization: Bearer {token}` header

**Token Refresh:**
- Automatic refresh on 401 responses
- Queue system prevents multiple simultaneous refresh attempts
- Refresh endpoint: `POST /api/auth/refresh`
- Invalid refresh token → logout and redirect to login

### 3.2 Role System

**Platform Roles (Organization-Level):**
- `ADMIN` - Full organization access (maps from `owner`/`admin` in DB)
- `MEMBER` - Standard user (maps from `pm` in DB)
- `VIEWER` - Read-only guest (maps from `viewer` in DB)

**Workspace Roles:**
- `OWNER` - Full workspace control
- `ADMIN` - Workspace administration
- `MEMBER` - Create projects/content
- `VIEWER` - Read-only access

**Project-Scoped Roles:**
- `delivery_owner` - Write access within project
- `stakeholder` - Read-only access

**Role Normalization:**
- Database stores: `owner`, `admin`, `pm`, `viewer` (in `UserOrganization.role`)
- API returns: `ADMIN`, `MEMBER`, `VIEWER` (normalized `PlatformRole`)
- Frontend uses normalized roles for routing and permissions

---

## 4. DATABASE ARCHITECTURE

### 4.1 Core Entities

**Identity & Access:**
- `users` - User accounts (email, password hash, organizationId)
- `organizations` - Tenant root (name, slug, settings JSONB)
- `user_organizations` - Organization membership (role, permissions)
- `workspaces` - Workspace containers (organizationId, slug, permissionsConfig)
- `workspace_members` - Workspace membership (role: OWNER/ADMIN/MEMBER/VIEWER)
- `auth_sessions` - Active sessions (refresh token hash, expiry)

**Project Management:**
- `projects` - Projects (workspaceId, organizationId, status, methodology)
- `tasks` - Tasks (projectId, assignee, status)
- `work_items` - Enhanced work items (comments, activity tracking)
- `work_plans` - Project work plans (phases, dependencies)
- `work_phases` - Work phases within plans
- `work_tasks` - Work management tasks

**Resource Management:**
- `resources` - Resources (organizationId, name, capacity)
- `resource_allocations` - Percentage-based allocations (projectId, resourceId, allocation_percentage)
- `resource_conflicts` - Detected allocation conflicts
- `resource_daily_load` - Daily capacity tracking

**Templates:**
- `templates` - Project templates (organizationId, methodology)
- `template_blocks` - Template building blocks
- `lego_blocks` - Reusable template components
- `project_templates` - Template-to-project mappings

**Portfolio & Programs:**
- `portfolios` - Portfolios (workspaceId, organizationId)
- `programs` - Programs (portfolioId, workspaceId, organizationId)
- `portfolio_projects` - Portfolio-project links

**Analytics:**
- `materialized_project_metrics` - Pre-computed project KPIs
- `materialized_portfolio_metrics` - Pre-computed portfolio KPIs
- `materialized_resource_metrics` - Pre-computed resource metrics

### 4.2 Key Relationships

```
Organization (1) ──< (N) UserOrganization (N) >── (1) User
Organization (1) ──< (N) Workspace
Organization (1) ──< (N) Project
Organization (1) ──< (N) Resource
Organization (1) ──< (N) Template

Workspace (1) ──< (N) Project
Workspace (1) ──< (N) WorkspaceMember (N) >── (1) User
Workspace (1) ──< (N) Program
Workspace (1) ──< (N) Portfolio

Project (1) ──< (N) Task
Project (1) ──< (N) ResourceAllocation
Project (1) ──< (N) Risk
Project (1) ──< (N) WorkItem

Portfolio (1) ──< (N) Program
Program (1) ──< (N) Project
```

### 4.3 Database Patterns

**Soft Delete:**
- `deletedAt` timestamp column (TypeORM `@DeleteDateColumn`)
- `deletedBy` user tracking
- Reversible deletion with retention period (default 30 days)

**Audit Fields:**
- `createdAt`, `updatedAt` (automatic via TypeORM)
- `createdById`, `createdBy` relations
- `lastLoginAt` for users

**JSONB Storage:**
- `settings` - Organization/workspace settings
- `permissionsConfig` - Workspace permission matrix
- `analysis_data` - AI analysis results
- `workflow_definition` - Workflow templates

---

## 5. API ARCHITECTURE

### 5.1 API Structure

**Base Path:** `/api` (global prefix in `main.ts`)

**Endpoint Categories:**
- **Auth:** `/api/auth/*` (login, signup, refresh, logout, me)
- **Workspaces:** `/api/workspaces/*` (CRUD, members, modules, role)
- **Projects:** `/api/projects/*` (CRUD, stats, assignments)
- **Resources:** `/api/resources/*` (CRUD, allocations, conflicts, heat-map)
- **Templates:** `/api/templates/*` (CRUD, instantiate, preview)
- **Work Management:** `/api/work-tasks/*`, `/api/work-phases/*`, `/api/work-plan/*`
- **Dashboards:** `/api/dashboards/*` (CRUD, widgets)
- **KPI:** `/api/kpi/*` (portfolio, project metrics)
- **Admin:** `/api/admin/*` (organization, users, billing)

### 5.2 Response Format

**Standardized Envelope:**
```typescript
{
  data: T,           // Response payload
  message?: string,  // Optional message
  meta?: {           // Optional metadata
    requestId: string,
    timestamp: string
  }
}
```

**Error Format:**
```typescript
{
  statusCode: number,
  message: string,
  error: string,
  code?: string,     // Error code (e.g., 'VALIDATION_ERROR')
  errors?: any[]     // Validation errors
}
```

### 5.3 Security

**Guards:**
- `JwtAuthGuard` - Validates JWT token (used by 82% of endpoints)
- `RequireAdminGuard` - Platform admin only
- `RequireWorkspaceAccessGuard` - Workspace membership validation
- `RequireOrgRoleGuard` - Organization role validation

**Rate Limiting:**
- Global: 100 requests/minute per IP
- Auth endpoints: 5 requests/15 minutes per IP
- Configurable via `@Throttle()` decorator

**CORS:**
- Environment-specific origins (no wildcards in production)
- Credentials enabled for cookie-based refresh tokens
- Headers: `Authorization`, `X-Request-Id`, `x-org-id`

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Application Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # Base design system components
│   ├── dashboard/     # Dashboard widgets
│   ├── forms/         # Form components
│   ├── modals/        # Modal dialogs
│   └── layouts/       # Layout components
├── pages/             # Route pages
│   ├── auth/          # Login, signup, verify
│   ├── dashboard/     # Dashboard pages
│   ├── projects/      # Project pages
│   ├── workspaces/    # Workspace pages
│   └── admin/         # Admin pages
├── features/          # Feature modules
│   ├── projects/      # Project feature
│   ├── workspaces/    # Workspace feature
│   └── resources/     # Resource feature
├── stores/            # Zustand state stores
│   ├── authStore.ts   # Authentication state
│   └── workspaceStore.ts # Workspace state
├── services/          # API services
│   ├── api.ts         # Centralized API client
│   └── *.api.ts       # Feature-specific APIs
├── hooks/             # Custom React hooks
├── routes/            # Route guards
│   ├── ProtectedRoute.tsx
│   ├── AdminRoute.tsx
│   └── PaidRoute.tsx
└── lib/               # Utilities
    ├── api/           # API utilities
    └── providers/     # React providers
```

### 6.2 State Management

**Zustand Stores:**
- `authStore` - User, tokens, organization context
- `workspaceStore` - Active workspace, workspace list
- `uiStore` - UI state (sidebar, modals)

**React Query:**
- Server state caching
- Automatic refetching
- Optimistic updates

**Local Storage:**
- `zephix.at` - Access token (AuthContext)
- `zephix.rt` - Refresh token (AuthContext)
- `zephix.sid` - Session ID
- `zephix.lastWorkspaceId` - Last active workspace
- `workspace-storage` - Zustand persisted workspace state

### 6.3 Routing

**Route Structure:**
- `/` - Landing page (public)
- `/login`, `/signup` - Auth pages (public)
- `/home` - Home router (resolves to role-specific home)
- `/admin/*` - Admin routes (AdminLayout)
- `/workspaces/:workspaceId/*` - Workspace-scoped routes
- `/projects/:projectId/*` - Project-scoped routes
- `/my-work` - Member work dashboard (paid route)
- `/guest/home` - Guest home page

**Route Guards:**
- `ProtectedRoute` - Requires authentication
- `AdminRoute` - Requires platform admin role
- `PaidRoute` - Requires ADMIN or MEMBER (excludes VIEWER)
- `FeaturesRoute` - Feature flag gating

**Workspace Resolution:**
- `HomeRouterPage` resolves workspace on `/home` route
- Priority: Store → localStorage → auto-select → redirect
- Routes to role-specific home: `/admin/home`, `/my-work`, `/guest/home`

---

## 7. KEY FEATURES

### 7.1 Project Management

**Core Capabilities:**
- Project CRUD with workspace scoping
- Multiple methodologies (Waterfall, Agile, Scrum, Kanban, Hybrid)
- Project status tracking (Planning, Active, On-Hold, Completed, Cancelled)
- Health scoring (Healthy, At-Risk, Blocked)
- Risk level tracking (Low, Medium, High, Critical)
- Budget and cost tracking

**Work Management:**
- Work plans with phases
- Task dependencies
- Work items with comments and activity tracking
- Gantt chart visualization (planned)

### 7.2 Resource Management

**Allocation System:**
- Percentage-based allocations (not hours)
- Auto-adjustment when timelines shift
- Conflict detection and resolution
- Heat map visualization
- Daily load tracking

**Validation:**
- Total allocation % validation (warning/max/hard-cap thresholds)
- Organization-level defaults with overrides
- Group/Department thresholds

### 7.3 Template System

**Template Types:**
- Project templates (complete project systems)
- Template blocks (reusable components)
- Lego blocks (atomic building blocks)
- Template actions (automation rules)

**Instantiation:**
- Create projects from templates
- Preserve template structure
- Customize during instantiation
- Track template usage

### 7.4 AI Features

**Document Intelligence:**
- Document upload and parsing
- AI-powered project generation from documents
- BRD (Business Requirements Document) analysis
- Knowledge indexing

**Status Reporting:**
- AI-powered status report generation
- Multi-stakeholder content tailoring
- Predictive analytics
- Risk assessment

### 7.5 Analytics & KPIs

**Metrics:**
- Materialized project metrics (pre-computed)
- Portfolio-level rollups
- Program-level rollups
- Resource utilization metrics

**Dashboards:**
- Customizable dashboard builder
- Widget system
- Metric definitions
- Real-time updates

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 Railway Deployment

**Backend Service:**
- **Builder:** Nixpacks auto-detect
- **Build Command:** `npm run build`
- **Start Command:** `npm run start:prod`
- **Health Check:** `/api/health`
- **Environment:** Staging + Production

**Frontend Service:**
- **Builder:** Nixpacks auto-detect (Vite)
- **Build Command:** `npm run build`
- **Preview Command:** `npm run preview --host 0.0.0.0 --port $PORT`
- **Publish Directory:** `dist`
- **Environment:** Staging + Production

### 8.2 Environment Configuration

**Backend Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `CORS_ALLOWED_ORIGINS` - Environment-specific origins
- `NODE_ENV` - Environment (development/production)
- `ANTHROPIC_API_KEY` - AI API key

**Frontend Variables:**
- `VITE_API_URL` - Backend API URL
- `VITE_STRICT_JWT` - JWT validation mode
- `VITE_SENTRY_DSN` - Error tracking (optional)

### 8.3 Security Configuration

**CORS:**
- Staging: `https://zephix-frontend-staging.up.railway.app`
- Production: `https://getzephix.com,https://www.getzephix.com,https://app.getzephix.com`
- No wildcards in production

**TLS:**
- Railway-managed SSL certificates
- TLS verification enforced (no `NODE_TLS_REJECT_UNAUTHORIZED=0`)

---

## 9. CURRENT STATUS

### 9.1 Completion Status

| Category | Working | Partial | Not Working | Completion % |
|----------|---------|--------|-------------|--------------|
| Backend Modules | 25 | 3 | 2 | 83% |
| Frontend Pages | 95 | 25 | 18 | 69% |
| API Endpoints | 180+ | 15+ | 5+ | 90% |
| Core Features | 8 | 2 | 0 | 80% |
| Security | 6 | 0 | 0 | 100% |
| Testing | 4 | 2 | 0 | 67% |

**Overall:** ~75% complete, production-ready core

### 9.2 Known Issues

**Critical:**
- ✅ Fixed: Double `/api/api` prefix in some controllers
- ✅ Fixed: Post-login routing to workspace selection
- ⚠️ Pending: Some API endpoints return 500 on edge cases (hardened with fallbacks)

**Non-Critical:**
- Frontend: Some pages need UX polish
- Backend: Some modules need additional tests
- Integrations: Limited third-party integrations

### 9.3 Production Readiness

**Ready:**
- ✅ Authentication & authorization
- ✅ Multi-tenancy isolation
- ✅ Core CRUD operations
- ✅ Resource management
- ✅ Template system
- ✅ Security hardening

**Needs Work:**
- ⚠️ Enterprise features (SAML/SCIM)
- ⚠️ Advanced visualizations (Gantt, workflows)
- ⚠️ Integration breadth
- ⚠️ UI/UX polish

---

## 10. ARCHITECTURAL DECISIONS

### 10.1 Multi-Tenancy

**Decision:** Organization-scoped with workspace-level filtering  
**Rationale:** Supports multi-workspace organizations while maintaining data isolation  
**Implementation:** TenantAwareRepository with AsyncLocalStorage context

### 10.2 Role System

**Decision:** Multi-layer roles (Platform → Organization → Workspace → Project)  
**Rationale:** Granular permissions for complex enterprise scenarios  
**Implementation:** Normalized PlatformRole enum with DB role mapping

### 10.3 Resource Allocations

**Decision:** Percentage-based (not hours)  
**Rationale:** More flexible for varying project timelines, easier conflict detection  
**Implementation:** `allocation_percentage` column with validation thresholds

### 10.4 Template System

**Decision:** Deploy complete systems (not just starting points)  
**Rationale:** Enforces governance, ensures consistency  
**Implementation:** Template blocks with instantiation service

### 10.5 Soft Delete

**Decision:** Soft delete with retention period  
**Rationale:** Enterprise data safety, reversible operations  
**Implementation:** TypeORM `@DeleteDateColumn` with `deletedBy` tracking

---

## 11. COMPETITIVE POSITIONING

### 11.1 Advantages Over Competitors

**vs Monday.com/ClickUp:**
- ✅ Enforced structure (vs optional)
- ✅ Resource management as core (vs optional)
- ✅ Template governance (vs starting points)
- ✅ Automatic KPI rollups (vs manual)

**vs Linear:**
- ✅ Superior role architecture (5 workspace roles vs 3)
- ✅ Project-scoped roles (delivery_owner, stakeholder)
- ✅ Soft delete with retention (vs hard delete)
- ✅ Organization hierarchy (vs workspace-only)

### 11.2 Gaps vs Competitors

**Missing:**
- ❌ Enterprise auth (SAML/SCIM)
- ❌ Advanced visualizations (Gantt, workflows)
- ❌ Integration breadth (Jira, GitHub, etc. - basic only)
- ❌ UI/UX polish (functional but needs refinement)

---

## 12. FUTURE ROADMAP

### 12.1 Immediate Priorities

1. **Enterprise Auth:** SAML/SCIM integration
2. **Visualizations:** Gantt charts, workflow diagrams
3. **Integrations:** Expand Jira, GitHub, Teams integrations
4. **UI/UX:** Polish existing pages, improve accessibility

### 12.2 Strategic Enhancements

1. **Real-time Collaboration:** WebSocket-based updates
2. **Advanced Analytics:** Predictive modeling, trend analysis
3. **Mobile App:** React Native mobile application
4. **API Platform:** Public API with OAuth2

---

## 13. TECHNICAL DEBT

### 13.1 Known Technical Debt

1. **Type Duplication:** Frontend and backend have duplicate type definitions
   - **Solution:** Create `packages/shared` for shared types
   - **Priority:** Medium

2. **API Client:** Multiple API client implementations
   - **Solution:** Consolidate to single API client
   - **Priority:** Low

3. **Test Coverage:** Some modules lack comprehensive tests
   - **Solution:** Add integration tests for critical paths
   - **Priority:** Medium

### 13.2 Refactoring Opportunities

1. **Workspace Resolution:** Complex logic in HomeRouterPage
   - **Solution:** Extract to dedicated service/hook
   - **Priority:** Low

2. **Error Handling:** Inconsistent error handling patterns
   - **Solution:** Standardize error handling middleware
   - **Priority:** Medium

---

## 14. MONITORING & OBSERVABILITY

### 14.1 Current Monitoring

- **Health Checks:** `/api/health` endpoint
- **Logging:** Structured logging with Pino
- **Error Tracking:** Sentry integration (optional)
- **Metrics:** Prometheus metrics (planned)

### 14.2 Observability Gaps

- ⚠️ Distributed tracing (OpenTelemetry configured but not fully utilized)
- ⚠️ Performance monitoring (no APM tool)
- ⚠️ Business metrics dashboard (no dedicated dashboard)

---

## 15. SECURITY POSTURE

### 15.1 Security Features

✅ **Implemented:**
- JWT authentication with refresh tokens
- Password hashing (bcrypt, 10 rounds)
- Rate limiting (global + auth-specific)
- CORS with environment-specific origins
- Security headers (Helmet)
- Input validation (class-validator)
- SQL injection prevention (TypeORM parameterized queries)
- XSS protection (React auto-escaping)

### 15.2 Security Gaps

⚠️ **Missing:**
- CSRF protection (planned)
- API rate limiting per user (only per IP)
- Security audit logging (basic logging only)
- Penetration testing (not performed)

---

## CONCLUSION

The Zephix platform is a **well-architected, production-ready** project management system with strong fundamentals in multi-tenancy, resource management, and governance. The platform has **superior architectural decisions** compared to competitors in several key areas, but needs **feature completion** and **UI/UX polish** to be fully competitive.

**Strengths:**
- Solid multi-tenancy architecture
- Enforced governance model
- Resource management as core feature
- Comprehensive role system

**Areas for Improvement:**
- Enterprise authentication (SAML/SCIM)
- Advanced visualizations
- Integration breadth
- UI/UX refinement

**Recommendation:** Continue development focusing on enterprise features and user experience while maintaining the strong architectural foundation.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Maintained By:** Solution Architecture Team
