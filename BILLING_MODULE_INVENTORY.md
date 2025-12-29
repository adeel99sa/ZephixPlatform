# BillingModule Migration Inventory

## Step 1: Inventory Billing Surfaces

### Controllers and Routes

**File**: `zephix-backend/src/billing/controllers/billing.controller.ts`

**Routes**:
1. `GET /api/billing/plans` - Get all available plans
2. `GET /api/billing/subscription` - Get current organization subscription
3. `GET /api/billing/current-plan` - Get current organization plan
4. `POST /api/billing/subscribe` - Create or update subscription (501 Not Implemented)
5. `PATCH /api/billing/subscription` - Update subscription (501 Not Implemented)
6. `POST /api/billing/cancel` - Cancel subscription (501 Not Implemented)
7. `GET /api/billing/usage` - Get usage limits and current usage

**All routes use**: `@UseGuards(JwtAuthGuard)` - Gets `organizationId` from `req.user.organizationId`

### Entities Touched

1. **Plan** (`zephix-backend/src/billing/entities/plan.entity.ts`)
   - **Scoping**: **GLOBAL** (no `organizationId` column)
   - **Rationale**: Plans are shared across all organizations (product catalog)
   - **Action**: Keep as `@InjectRepository(Plan)` - this is a global entity exception

2. **Subscription** (`zephix-backend/src/billing/entities/subscription.entity.ts`)
   - **Scoping**: **ORG-SCOPED** (has `organizationId` column)
   - **Action**: Migrate to `TenantAwareRepository<Subscription>`

3. **Organization** (from `organizations` module)
   - **Scoping**: **GLOBAL** (defines tenant boundary)
   - **Usage**: `dataSource.getRepository(Organization)` in `SubscriptionsService`
   - **Action**: Keep as direct repository access (infrastructure-level, acceptable)

### Repository Injection Patterns Found

**File**: `zephix-backend/src/billing/services/plans.service.ts`
- `@InjectRepository(Plan)` - Line 11
- **Action**: Keep as-is (Plan is global entity)

**File**: `zephix-backend/src/billing/services/subscriptions.service.ts`
- `@InjectRepository(Subscription)` - Line 23
- `@InjectRepository(Plan)` - Line 25
- `dataSource.getRepository(Organization)` - Lines 54, 120, 224
- **Action**:
  - Replace `@InjectRepository(Subscription)` with `TenantAwareRepository<Subscription>`
  - Keep `@InjectRepository(Plan)` (global entity)
  - Keep `dataSource.getRepository(Organization)` (infrastructure-level access)

### Query Builder Usage

**Found**: None
- Services use simple `find()`, `findOne()`, `save()` operations
- No `createQueryBuilder()` usage

### Manual OrganizationId Filters

**File**: `zephix-backend/src/billing/services/subscriptions.service.ts`
- Line 35: `where: { organizationId }` in `findForOrganization()`
- **Action**: Remove - TenantAwareRepository will auto-scope

### Input Validation (organizationId in Input)

**Controller**: `billing.controller.ts`
- ✅ All routes get `organizationId` from `req.user.organizationId` only
- ✅ No routes accept `organizationId` in body, query, or params
- **Status**: Already compliant

**DTOs**:
- `CreateSubscriptionDto` - No `organizationId` field
- `UpdateSubscriptionDto` - No `organizationId` field
- **Status**: Already compliant

## Step 2: Classify Scoping

### Billing Data Scoping

- **Plan**: Global (shared product catalog)
- **Subscription**: Org-scoped (belongs to organization)
- **Organization**: Global (tenant boundary)

### Workspace-Scoped Entity Access

**Found**: None
- Billing module does not read workspace-scoped entities (projects, work items)
- All billing data is org-scoped or global

## Step 3: Migration Plan

### Module Updates
- Add `TenancyModule` import
- Add `createTenantAwareRepositoryProvider(Subscription)`
- Keep `TypeOrmModule.forFeature([Plan, Subscription])` for Plan access

### Service Updates

**PlansService**:
- ✅ No changes needed (Plan is global entity)

**SubscriptionsService**:
- Replace `@InjectRepository(Subscription)` with `TenantAwareRepository<Subscription>`
- Keep `@InjectRepository(Plan)` (global entity)
- Keep `dataSource.getRepository(Organization)` (infrastructure access)
- Remove manual `organizationId` filter from `findForOrganization()`
- Get `organizationId` from `TenantContextService` instead of parameter
- Update `create()`, `update()`, `cancel()` to get `organizationId` from context

### Controller Updates
- ✅ No changes needed (already uses `req.user.organizationId`)

## Step 4: Error Normalization

- **Org-scoped resource not found**: Return 404 (Subscription not found in tenant)
- **Workspace access failures**: N/A (no workspace-scoped routes in billing)

## Step 5: Tests Required

1. **E2E read isolation**: Create subscription in org A, ensure org B cannot fetch it (404)
2. **E2E write isolation**: Org B cannot update/delete org A subscription (404)
3. **Concurrency test**: Verify no context bleed
4. **Guardrail scan**: Verify no new bypass patterns

## Files to Modify

1. `zephix-backend/src/billing/billing.module.ts` - Add TenancyModule and provider
2. `zephix-backend/src/billing/services/subscriptions.service.ts` - Migrate to TenantAwareRepository
3. `zephix-backend/test/tenancy/billing-tenant-isolation.e2e-spec.ts` - Add tests (new file)
4. `docs/ACCEPTABLE_INJECT_REPOSITORY_EXCEPTIONS.md` - Document Plan as global entity exception

## Files NOT to Modify

- `zephix-backend/src/billing/services/plans.service.ts` - Plan is global, keep as-is
- `zephix-backend/src/billing/controllers/billing.controller.ts` - Already compliant


