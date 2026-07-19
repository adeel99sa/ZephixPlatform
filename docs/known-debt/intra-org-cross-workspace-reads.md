# Known debt — intra-org cross-workspace access (DOC-TENANT-1 sweep tail)

**Status:** tracked, not yet fixed. Lower severity than the cross-org holes.
**Scheduled:** Phase 1 security pass, alongside the OWASP remap — NOT open-ended
backlog. **Decision due by 2026-08-01** (operator-adjustable): either fix the
named controllers or accept the risk with a written rationale. If this date
passes without a decision, escalate rather than let it sit silently.
**Source:** the DOC-TENANT-1 audit (2026-07-18) that classified all 56 controllers
taking `workspaceId`/`projectId` from the URL path. Three categories emerged:
cross-org exploitable (fixed — GOV-BUILD-W1B), **intra-org cross-workspace**
(this doc), and safe.

## The second, smaller bug class

The controllers below are **cross-org safe** — their service constrains the
project/entity lookup by `organizationId` (either `where: { …, organizationId }`
or an explicit `if (row.organizationId !== callerOrg) throw`). So a caller in
org A **cannot** reach org B's data through them.

What they lack is a **workspace-membership** check. A member of org A who is not
a member of workspace W (within org A) can still read W's project data by
supplying W's project id in the path. This is an *intra-org, cross-workspace*
read/authorization gap — a privilege scope issue inside one tenant, not a
tenant-isolation breach.

### Named controllers (verify per-controller before fixing)

| Controller | Path shape | Notes |
|---|---|---|
| `work-management/controllers/earned-value.controller.ts` | `:projectId` | project loaded `where:{id,organizationId}`; header workspace role-checked, path project not membership-checked |
| `work-management/controllers/project-health.controller.ts` | `:projectId` | queries `where:{projectId,organizationId}`; no workspace membership |
| `work-management/controllers/schedule-integrity.controller.ts` | `:projectId` | queries `where:{projectId,organizationId}`; no workspace membership |
| `work-management/controllers/project-status.controller.ts` | `:projectId` | tenant-aware repo (org-safe); no workspace membership |
| `template-center/apply/template-apply.controller.ts` | `:projectId` | project `where:{id,organizationId}` |
| `template-center/documents/document-attach.controller.ts` | `:projectId` | org check on project |
| `template-center/documents/document-lifecycle.controller.ts` | `:projectId` | org check + `assertProjectAccess` (may already cover membership — verify) |
| `template-center/evidence/evidence-pack.controller.ts` | `:projectId` | `if project.organizationId !== org throw` |
| `template-center/gates/gate-approvals.controller.ts` | `:projectId` | org check; **gate DECIDE** — who-can-decide is governance-adjacent (see gate finalization work) |
| `template-center/kpis/project-kpis.controller.ts` | `:projectId` | org check + `assertProjectAccess` |

The template-center set mostly calls an `assertProjectAccess`/`getEffectiveWorkspaceRole`
helper that *may* already enforce membership — each needs a per-controller
confirmation before deciding whether a fix is required. `gate-approvals` decide
overlaps the gate-finalization authority work and should be handled there.

Suggested fix shape (when prioritized): derive the workspace from the org-scoped
project load, then `WorkspaceRoleGuardService.requireWorkspaceRead(workspaceId, userId)`
— the same membership primitive used by the cross-org fixes.

## Latent (dead code) — not currently exploitable

- `workspaces/workspace-modules.controller.ts` — **not registered in any module**
  (not in `workspaces.module.ts` controllers, no other import), so its routes
  `GET /workspaces/:workspaceId/modules[/:moduleKey]` are **not mounted**. Its
  service (`workspace-module.service.ts`) queries `where: { workspaceId }` with
  **no org filter**, and `WorkspaceModuleConfig` has no `organization_id` column.
  If this controller is ever wired in, it is a cross-org hole and must be fixed
  first (add `organization_id` to the entity + a membership/`canAccessWorkspace`
  check, like the `documents` fix). A contract spec exists
  (`workspace-modules.controller.spec.ts`) but does not mount the route.

## To verify (not confirmed in the sweep)

- `templates/controllers/template.controller.ts` `getTemplateById(:id)` — confirm
  the template load is org/system-scoped and cannot return another org's private
  template by id.
