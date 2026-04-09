# Template Center MVP — Source of Truth

> Phase 0 discovery output. Corrected and approved before Phase 1 code.
> Last updated: 2026-04-05

## 1. Executive Summary

Template Center has substantial existing infrastructure across both frontend and backend. Two template systems co-exist: the original `templates` table (v1, simpler) and the newer `template-center` module (v2, with definitions, versions, components, policies). The v5.1 instantiation endpoint is the canonical project creation path and is fully functional.

The main gaps for MVP are:
- Template cards in the modal use **hardcoded placeholder data** — not connected to real backend templates
- The workspace "+" menu label needs renaming to "Create from template"
- Template detail view before applying is basic
- Project shell after creation shows all 12 tabs — MVP should show only 4
- No "save as template" flow exists yet

## 2. Hard Rules (Locked)

These rules override any prior assumptions and must be followed in all phases.

### HR1. No blank-project fallback from Template Center
If a template card does not map to a real backend template record, **do not show it**. Do not silently create a blank project when a user clicks "Use template".

### HR2. Phase 1 uses v1 templates only
Use the `templates` table (v1) for all MVP execution paths. Do not mix v2 `template-center` module into Phase 1. V2 migration is deferred.

### HR3. Visible project tabs for MVP
After project creation from template, only these tabs are visible in project navigation:
- **Overview**
- **Project Activities**
- **Board**
- **Gantt**

Other tabs remain in code/routes but are NOT shown in project navigation until explicitly enabled in a later phase.

### HR4. Label is "Create from template"
The workspace "+" menu entry must say **"Create from template"**, not "New Template" or "New from template".

### HR5. Empty sections must be hidden
Any template source bucket (e.g., "Created by me") that has no backend data source wired must be **hidden**, not shown empty.

### HR6. Template data must be real
Every template card shown in the Template Center must be backed by a real backend template record with real phases and tasks. No hardcoded frontend-only placeholder templates.

## 3. Current State Inventory

### What Already Works

| Feature | Status | Evidence |
|---------|--------|----------|
| Template Center modal (5 categories, 16 cards) | Working UI, placeholder data | `TemplateCenterModal.tsx` |
| Template instantiation `POST /templates/:id/instantiate-v5_1` | Fully functional | Creates project + phases + tasks in transaction |
| Template preview `GET /templates/:id/preview-v5_1` | Functional | Returns phases, tasks, lock policy |
| Template listing `GET /templates` | Functional | Supports scope filtering |
| Template creation `POST /templates` | Functional | Admin/Owner creates templates |
| Project shell with 12 tabs | Functional | ProjectPageLayout.tsx with all tabs routed |
| Template scoping (SYSTEM, ORG, WORKSPACE) | Functional | Backend enforced |
| Admin template management page | Functional | `/administration/templates` route |

### What Is Placeholder Only

| Feature | Issue | Location |
|---------|-------|----------|
| Template Center modal cards | Hardcoded — not connected to backend templates | `TemplateCenterModal.tsx` lines 35-199 |
| Template descriptions | Generic placeholder text | Same file |
| Template "phases" preview | Static arrays, not from backend | Same file |
| "Created by me" section | Empty, no backend fetch | Same file |

### What Is Broken or Misleading

| Issue | Location | Impact |
|-------|----------|--------|
| Menu says "New from template" — should be "Create from template" | `SidebarWorkspaces.tsx` | Label mismatch |
| Templates without `backendTemplateId` create blank projects | `TemplateCenterModal.tsx` | Violates HR1 |
| Multiple overlapping template systems (v1 + v2) | Backend modules | Complexity risk — HR2 locks v1 for MVP |
| Legacy `project-template.entity.ts` still exists | Backend entity | Dead code |
| Multiple frontend template pages co-exist | Various | Confusing codebase |

## 4. Route Map

### Frontend Routes

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/templates` | `TemplateRouteSwitch` → `TemplateCenter` | Main template browsing | Active |
| `/templates?mode=activation` | `ActivationTemplatePicker` | First-project activation | Active |
| `/administration/templates` | `AdministrationTemplatesPage` | Admin template management | Active |
| `/projects/:projectId` | `ProjectPageLayout` | Created project shell | Active |

### Backend Endpoints (Template-Related)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | `/templates` | List templates | Active |
| GET | `/templates/published` | List published | Active |
| GET | `/templates/recommendations` | Recommendations | Active |
| POST | `/templates` | Create template | Active |
| GET | `/templates/:id` | Get template | Active |
| GET | `/templates/:id/preview-v5_1` | Preview | Active |
| **POST** | **`/templates/:id/instantiate-v5_1`** | **Create project from template** | **Active — canonical** |
| POST | `/templates/:id/publish` | Publish template | Active |

## 5. Component Map

### Core Components (Keep)

| Component | File | Purpose |
|-----------|------|---------|
| `TemplateCenterModal` | `features/templates/components/TemplateCenterModal.tsx` | Modal overlay — needs real data |
| `ProjectNameModal` | `features/templates/components/ProjectNameModal.tsx` | Name input before project creation |
| `TemplatePreviewModal` | `features/templates/components/TemplatePreviewModal.tsx` | Template detail preview |
| `ProjectPageLayout` | `features/projects/layout/ProjectPageLayout.tsx` | Project shell — needs MVP tab filtering |

### Legacy Components (Cleanup Candidates)

| Component | File | Status |
|-----------|------|--------|
| `TemplateCenterPage` | `pages/templates/TemplateCenterPage.tsx` | Dead — no longer routed |
| `TemplateHubPage` | `pages/templates/TemplateHubPage.tsx` | Unused |
| `TemplatesPage` | `pages/templates/TemplatesPage.tsx` | Legacy |
| `TemplateCenter` view | `views/templates/TemplateCenter.tsx` | May overlap with modal |

## 6. Data Contract Map

### Template Entity (v1 Backend — MVP path)

```typescript
{
  id: UUID,
  name: string,
  description: string | null,
  category: string | null,
  kind: 'project' | 'board' | 'mixed',
  template_scope: 'SYSTEM' | 'ORG' | 'WORKSPACE',
  organization_id: UUID | null,
  workspace_id: UUID | null,
  methodology: string | null,
  structure: JSONB | null,
  phases: JSONB,
  task_templates: JSONB,
  default_tabs: JSONB,
  default_enabled_kpis: string[],
  is_active: boolean,
  is_system: boolean,
  lock_state: 'UNLOCKED' | 'LOCKED',
}
```

### Instantiate Response

```typescript
{
  projectId: string,
  projectName: string,
  state: 'DRAFT' | 'ACTIVE' | 'COMPLETED',
  structureLocked: boolean,
  phaseCount: number,
  taskCount: number,
}
```

## 7. MVP In-Scope (Phased)

| Feature | Phase |
|---------|-------|
| Rename menu to "Create from template" | Phase 1 |
| Seed real templates in v1 `templates` table | Phase 1 |
| Connect modal to `GET /templates` — real data only | Phase 1 |
| Template detail view (phases, tasks, methodology, tabs) | Phase 1 |
| Create project from template in current workspace | Phase 1 |
| Hide unsupported template sections | Phase 1 |
| Project shell: Overview, Activities, Board, Gantt only | Phase 2 |
| Project Overview (PM, team, dates, docs, milestones) | Phase 2 |
| Project Activities (phases, tasks, assignees, deps) | Phase 2 |
| Basic filters, field toggle, sort, search | Phase 3 |
| Save project as template | Phase 4 |
| Admin default template governance | Phase 5 |

## 8. MVP Out-of-Scope

| Feature | Reason |
|---------|--------|
| Template versioning UI | Post-MVP |
| Template analytics | Post-MVP |
| Template marketplace | Post-MVP |
| Cross-workspace multi-create | Not enterprise pattern |
| Deep customization during apply | Adds friction |
| Advanced automations editor | Separate engine |
| Full custom field builder | Phase 3+ |
| Admin inheritance visualization | Phase 5+ |
| Template approval workflow | Post-MVP governance |
| v2 template-center module in execution path | Deferred per HR2 |

## 9. Locked Decisions for Phase 1

| # | Decision | Value |
|---|----------|-------|
| D1 | Template data source | Real backend templates only, seeded in v1 `templates` table |
| D2 | Menu label | "Create from template" |
| D3 | Template detail shows | Name, methodology badge, real description, phases, task count by phase, included tabs, scope label |
| D4 | Apply flow | Current workspace only, project name before create, no blank-project fallback |
| D5 | Visible project tabs after creation | Overview, Project Activities, Board, Gantt — others hidden from nav |
| D6 | Empty sections | Hidden until backed by live data |
| D7 | Template system | v1 only — no v2 template-center in Phase 1 |

## 10. Risks and Dependencies

| Risk | Mitigation |
|------|-----------|
| Two template systems co-exist | HR2 locks v1 for MVP, v2 deferred |
| 16 hardcoded templates create blank projects | HR1 forbids this — Phase 1 replaces with real data |
| Project shows 12 tabs | HR3 locks 4 visible tabs for MVP |
| No "save as template" path | Phase 4 scope |
| Template scope enforcement is backend-only | Frontend must respect scope in display |
