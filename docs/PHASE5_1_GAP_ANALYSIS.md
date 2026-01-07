# Phase 5.1 Gap Analysis: Comprehensive Prompt vs Current Backend

**Date**: 2025-01-XX  
**Status**: Gap Analysis Complete  
**Branch**: `phase5-1-work-management`

## Executive Summary

The comprehensive Phase 5.1 prompt requires a **Template Center decision engine**, **work phases/structure**, **state machine for work start**, **health/risk calculation**, and **role-based access control** that are **not yet implemented** in the current backend.

**Current State**: Basic work management APIs (tasks, dependencies, comments, activity) are implemented. Template instantiation exists but lacks the decision engine, structure locking, and health/risk features.

**Gap Severity**: **HIGH** - Core features for UAT are missing.

---

## 1. API Coverage Analysis

### ✅ Implemented APIs

**Work Management:**
- `GET /api/work/tasks` - List tasks ✅
- `POST /api/work/tasks` - Create task ✅
- `GET /api/work/tasks/:id` - Get task ✅
- `PATCH /api/work/tasks/:id` - Update task ✅
- `DELETE /api/work/tasks/:id` - Delete task ✅
- `PATCH /api/work/tasks/bulk` - Bulk update ✅
- `POST /api/work/tasks/:id/dependencies` - Add dependency ✅
- `DELETE /api/work/tasks/:id/dependencies` - Remove dependency ✅
- `GET /api/work/tasks/:id/dependencies` - List dependencies ✅
- `POST /api/work/tasks/:id/comments` - Add comment ✅
- `GET /api/work/tasks/:id/comments` - List comments ✅
- `GET /api/work/tasks/:id/activity` - Activity feed ✅

**Templates (Partial):**
- `GET /api/templates` - Catalog ✅
- `GET /api/templates/:id` - Preview ✅
- `POST /api/templates/:id/instantiate` - Create from template ✅
- `POST /api/templates/create-project` - Create from template/blank ✅

**Container Lists:**
- `GET /api/workspaces` - List workspaces ✅ (assumed, not verified)
- `GET /api/portfolios` - List portfolios ✅ (assumed, not verified)
- `GET /api/programs` - List programs ✅ (assumed, not verified)
- `GET /api/projects` - List projects ✅ (assumed, not verified)

### ❌ Missing APIs (Required by Prompt)

**Overview APIs:**
- `GET /api/programs/:id/overview` - Program overview with health, needs attention, next actions ❌
- `GET /api/projects/:id/overview` - Project overview with health, needs attention, next actions ❌

**Work Plan APIs:**
- `GET /api/projects/:id/work-plan` - Get work plan with phases and tasks grouped ❌
- `GET /api/programs/:id/work-plan` - Get work plan for program ❌

**Template Center Decision Engine:**
- `GET /api/templates/recommendations` - Get top 3 recommended templates with reason codes ❌
- `POST /api/templates/:id/preview` - Get template preview with structure summary ❌

**Health & Risk APIs:**
- `GET /api/projects/:id/health` - Calculate health (Healthy, At risk, Blocked) ❌
- `GET /api/projects/:id/needs-attention` - Get needs attention list with reasons ❌
- `GET /api/programs/:id/health` - Program health calculation ❌
- `GET /api/programs/:id/needs-attention` - Program needs attention list ❌

**Work Start & Structure Locking:**
- `POST /api/projects/:id/start` - Start work (Draft → Active), lock structure ❌
- `GET /api/projects/:id/structure-lock-status` - Check if structure is locked ❌
- `POST /api/projects/:id/acknowledge-reporting-impact` - Acknowledge reporting impact changes ❌

---

## 2. Domain Model Gaps

### ✅ Implemented Entities

- `WorkTask` ✅
- `WorkTaskDependency` ✅
- `TaskComment` ✅
- `TaskActivity` ✅
- `Project` ✅ (existing)
- `Template` ✅ (existing, but may need enhancements)
- `ProjectTemplate` ✅ (existing)

### ❌ Missing Entities (Required by Prompt)

**Work Structure:**
- `WorkPhase` ❌ - Phases that group tasks
  - Fields needed: `id`, `projectId`, `name`, `order`, `startDate`, `endDate`, `milestone`, `locked`
- `TemplatePhase` ❌ - Phase definitions in templates
  - Fields needed: `id`, `templateId`, `name`, `order`, `defaultStartDate`, `defaultEndDate`, `milestone`, `locked`
- `TemplateTask` ❌ - Task definitions in templates
  - Fields needed: `id`, `templatePhaseId`, `title`, `description`, `defaultStatus`, `defaultOwner`, `required`, `locked`

**Template Metadata:**
- Template needs: `workTypeTags`, `scopeTags`, `requiredRoles`, `structureSummary`, `lockPolicy` ❌

**Work State:**
- Project needs: `state` enum (Draft, Active, Completed) ❌
- Project needs: `structureLocked` boolean ❌
- Project needs: `structureSnapshot` JSONB (template structure at start) ❌

---

## 3. Business Logic Gaps

### ✅ Implemented

- Task CRUD operations ✅
- Dependency cycle prevention ✅
- Activity emission ✅
- Workspace scoping ✅
- Template instantiation (basic) ✅

### ❌ Missing (Required by Prompt)

**Template Center Decision Engine:**
- Recommendation service with deterministic logic ❌
  - Inputs: container type, work type, duration range, complexity flag
  - Output: Top 3 templates with reason codes
- Template metadata enrichment ❌
  - Work type tags
  - Scope tags
  - Required roles
  - Structure summary
  - Lock policy

**Work Start State Machine:**
- State transitions: Draft → Active → Completed ❌
- Structure locking on start ❌
  - Lock phase count, order, identifiers, reporting keys
  - Allow: add tasks, update owners/dates/statuses, dependencies
  - Reject locked edits with explicit error codes

**Reporting Impact Acknowledgement:**
- Impact calculation service ❌
  - Returns: impact summary, impacted entities, acknowledgement token
- Frontend must resend token to confirm ❌

**Health & Risk Calculation:**
- Health calculation (Healthy, At risk, Blocked) ❌
- Risk detection (needs attention items) ❌
  - Reason code
  - Owner
  - Suggested next step
- Status enums mismatch ❌
  - Prompt requires: "Limited", "Stable"
  - Current: BACKLOG, TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE, CANCELED

**Role-Based Access Control:**
- Delivery owner role enforcement ❌
  - Exactly one delivery owner per container
- Stakeholder read-only enforcement ❌
  - Backend must enforce permissions

**Audit Logging:**
- Start work events ❌
- Structure lock events ❌
- Acknowledgement events ❌
- Status change events (may exist via TaskActivity) ⚠️
- Ownership change events (may exist via TaskActivity) ⚠️

**Data Integrity:**
- Exactly one delivery owner per container validation ❌
- Deleting tasks with dependencies: block or rewire logic ❌

---

## 4. Status & Health Language Gaps

### Current Status Enums
```typescript
TaskStatus: BACKLOG, TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE, CANCELED
```

### Prompt Requires
- Status: "Limited", "Stable" (text first, color second)
- Health: "Healthy", "At risk", "Blocked"
- Risk: "Needs attention" items with reason, owner, next step
- Delay: "Behind target by X days" (neutral tone)

**Gap**: Status enums don't match. Health/risk calculation missing entirely.

---

## 5. Template Customization Rules Gaps

### Prompt Requirements

**Before Start (Allowed):**
- Rename phases ✅ (if WorkPhase exists)
- Add tasks ✅ (if WorkPhase exists)
- Remove optional tasks ❌ (need to mark tasks as optional)
- Adjust milestone dates ✅ (if WorkPhase exists)
- Assign default owners ✅

**Guardrails:**
- Locked elements show lock icon and explanation ❌ (backend must return lock status)
- Reporting impacting edits require acknowledgement ❌ (acknowledgement flow missing)

**After Start:**
- Phase structure hidden ❌ (backend must hide locked structure)
- Show "Structure locked" label ❌ (backend must return lock status)
- Allowed edits remain visible ✅

**Gap**: Structure locking logic, acknowledgement flow, and lock status APIs missing.

---

## 6. Authorization Gaps

### Current Implementation
- JWT authentication ✅
- Workspace scoping ✅
- WorkspaceAccessService ✅

### Prompt Requirements
- Delivery owner role ❌ (not implemented)
- Stakeholder read-only ❌ (not enforced)
- Exactly one delivery owner per container ❌ (not validated)

**Gap**: Role-based access control for delivery owner and stakeholder missing.

---

## 7. Priority Implementation Order

### Critical (Blocking UAT)

1. **WorkPhase Entity & APIs** - Required for work plan view
2. **Work Start State Machine** - Required for structure locking
3. **Health & Risk Calculation** - Required for overview surfaces
4. **Template Recommendation Service** - Required for Template Center
5. **Structure Locking Logic** - Required for post-start behavior

### High Priority (UAT Quality)

6. **Overview APIs** (program/project) - Required for overview surfaces
7. **Work Plan API** - Required for work plan view
8. **Reporting Impact Acknowledgement** - Required for safe edits
9. **Delivery Owner & Stakeholder Roles** - Required for authorization
10. **Status/Health Language Alignment** - Required for UI consistency

### Medium Priority (Polish)

11. **Audit Logging Enhancements** - Required for compliance
12. **Template Metadata Enrichment** - Required for better recommendations
13. **Lock Status APIs** - Required for UI lock indicators

---

## 8. Estimated Effort

**Critical Gaps**: ~3-4 weeks
- WorkPhase entity & APIs: 3-5 days
- State machine & structure locking: 5-7 days
- Health/risk calculation: 3-5 days
- Template recommendation: 2-3 days
- Overview APIs: 2-3 days
- Work plan API: 2-3 days
- Authorization roles: 2-3 days

**Total**: ~20-30 days of focused development

---

## 9. Recommendations

1. **Immediate**: Validate if existing `Project` entity has `state` field or needs migration
2. **Immediate**: Design `WorkPhase` entity schema and migration
3. **Immediate**: Design template recommendation algorithm (deterministic logic)
4. **Next**: Implement work start state machine and structure locking
5. **Next**: Implement health/risk calculation service
6. **Then**: Build overview and work plan APIs
7. **Finally**: Add authorization roles and audit logging

---

## 10. Questions for Clarification

1. **Status Enums**: Should we keep current TaskStatus enums and add a separate "health" field, or replace TaskStatus?
2. **WorkPhase vs TemplatePhase**: Should WorkPhase be created from TemplatePhase on instantiation, or are they separate?
3. **Structure Snapshot**: Should we store full template structure JSONB in Project, or reference TemplatePhase/TemplateTask rows?
4. **Delivery Owner**: Is this a new role enum, or a field on Project/Program (e.g., `deliveryOwnerUserId`)?
5. **Stakeholder**: Is this a new role enum, or derived from existing workspace roles?

---

**Next Steps**: 
- [ ] Review this gap analysis with team
- [ ] Prioritize critical gaps
- [ ] Create detailed implementation plan for each gap
- [ ] Begin with WorkPhase entity design

