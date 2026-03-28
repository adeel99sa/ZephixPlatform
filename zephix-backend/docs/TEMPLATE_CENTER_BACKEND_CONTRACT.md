# Template Center Backend Contract

All routes live under global prefix `/api`. Feature flag: `TEMPLATE_CENTER_V1=true` enables apply and mutation endpoints; when off, apply/document transition/gate decide/assignees return 404. Read endpoints (templates, kpis, docs, search, project documents, project KPIs, evidence-pack) remain available when the flag is off.

## Tenant isolation

- Scope is derived from request context only. No query parameter may widen access. `getTemplateCenterScope(auth, query.workspaceId)` enforces organizationId from auth and optionally workspaceId (only if allowed for the user).
- Template list/filter: organization_id and workspace_id from scope; orgId is never accepted from query.
- Project-scoped reads (documents, KPIs, evidence-pack, apply, gates): project must belong to auth org and, when workspace context is set, to that workspace.

## Read APIs

### GET /api/template-center/templates

Query params: `scope`, `workspaceId` (validated against auth), `search`, `category`. orgId is not accepted from query.

Returns: array of template definitions with latest published version summary.

```json
[
  {
    "id": "uuid",
    "scope": "system",
    "orgId": null,
    "workspaceId": null,
    "templateKey": "waterfall_standard",
    "name": "Waterfall Standard",
    "description": "...",
    "category": "waterfall",
    "isPrebuilt": true,
    "isAdminDefault": false,
    "latestVersion": { "version": 1, "status": "published" }
  }
]
```

### GET /api/template-center/templates/:templateKey

Returns: definition and published versions.

```json
{
  "definition": { "id", "scope", "templateKey", "name", "description", "category", "isPrebuilt", "isAdminDefault" },
  "versions": [{ "id", "version", "status", "publishedAt", "changelog" }]
}
```

### GET /api/template-center/kpis

Query params: `category`, `search`, `activeOnly` (default true)

Returns: array of KPI definitions (id, kpiKey, name, category, unit, direction, rollupMethod, timeWindow, isActive).

### GET /api/template-center/docs

Query params: `category`, `search`, `activeOnly` (default true)

Returns: array of doc templates (id, docKey, name, category, contentType, isActive).

### GET /api/template-center/search

Query params: `q` (required), `context` (optional: template | kpi | doc | command), `limit` (default 20)

Returns: unified results for Cmd K.

```json
[
  {
    "type": "template" | "kpi" | "doc" | "command",
    "key": "waterfall_standard" | "spi" | "raid_log" | "add_kpis",
    "title": "Waterfall Standard",
    "subtitle": "Pre built template",
    "score": 0.87,
    "payload": { ... }
  }
]
```

## Apply (behind TEMPLATE_CENTER_V1)

### POST /api/template-center/projects/:projectId/apply

Body:

```json
{
  "templateKey": "waterfall_standard",
  "version": 1,
  "options": {
    "enforceRequired": true,
    "mode": "create_missing_only"
  }
}
```

Returns:

```json
{
  "applied": true,
  "templateKey": "waterfall_standard",
  "version": 1,
  "lineageId": "uuid",
  "createdKpis": 2,
  "createdDocs": 3,
  "existingKpis": 0,
  "existingDocs": 0
}
```

## Document lifecycle (behind TEMPLATE_CENTER_V1)

### POST /api/template-center/projects/:projectId/documents/:documentId/transition

Body:

```json
{
  "action": "submit_for_review" | "approve" | "request_changes" | "mark_complete" | "create_new_version" | "start_draft",
  "changeSummary": "optional",
  "content": {},
  "externalUrl": "optional",
  "fileStorageKey": "optional"
}
```

Actions and transitions: not_started → start_draft → draft; draft → submit_for_review → in_review; in_review → approve → approved, or request_changes → draft; approved → mark_complete → completed; completed → create_new_version → draft.

## Project document read (available when flag off)

### GET /api/template-center/projects/:projectId/documents

Returns list of document instances for the project (id, projectId, docKey, title, status, version, ownerUserId, reviewerUserId, updatedAt).

### GET /api/template-center/projects/:projectId/documents/:documentId

Returns latest document content (id, projectId, docKey, title, status, version, content, externalUrl, fileStorageKey, changeSummary, updatedAt).

### GET /api/template-center/projects/:projectId/documents/:documentId/history

Returns version history (version, status, changeSummary, createdAt, createdBy).

### PATCH /api/template-center/projects/:projectId/documents/:documentId/assignees (behind flag)

Body: `{ "ownerUserId?: string", "reviewerUserId?: string" }`. Updates owner and/or reviewer.

## Project KPI read and write

### GET /api/template-center/projects/:projectId/kpis

Returns project KPIs with latest value (id, projectId, kpiKey, name, category, unit, target, latestValue, latestAsOfDate).

### PUT /api/template-center/projects/:projectId/kpis/:kpiKey/value

Body: `{ "value": number, "asOfDate?: string", "note?: string" }`. Appends a kpi_values row; returns updated snapshot for that KPI.

## Gate approvals (behind TEMPLATE_CENTER_V1)

Gate blockers are derived from the applied template schema (template_lineage + template_versions.schema.gates[gateKey].requirements). They are not supplied in the request.

### POST /api/template-center/projects/:projectId/gates/:gateKey/decide

Body:

```json
{
  "decision": "approved" | "approved_with_comments" | "rejected",
  "comment": "optional",
  "evidence": { "links": [], "files": [] }
}
```

If required docs/KPIs are not satisfied for approval, returns 409:

```json
{
  "code": "gate_blocked",
  "gateKey": "gate_planning_approval",
  "blockers": [
    { "type": "document", "key": "project_schedule", "reason": "missing_doc_instance" | "doc_state_invalid" },
    { "type": "kpi", "key": "spi", "reason": "missing_project_kpi" }
  ]
}
```

## Evidence pack

### GET /api/template-center/projects/:projectId/evidence-pack

Query params: `format=json` (default)

Returns JSON bundle: templateLineage, gateApprovals, documentInstances, kpiSnapshot, plus: documents (docKey, status, version, updatedAt), kpis (kpiKey, latestValue, asOfDate), gates (gateKey, decision, decidedAt, decidedBy, comment).

## Seed scripts (require TEMPLATE_CENTER_SEED_OK=true)

- `npm run template-center:seed:kpis` — seed KPI definitions
- `npm run template-center:seed:docs` — seed doc templates
- `npm run template-center:seed:templates` — seed prebuilt template definitions and v1 published versions

## Database

Tables: template_definitions, template_versions, template_policies, template_components, kpi_definitions, project_kpis, kpi_values, doc_templates, document_instances, document_versions, gate_approvals, template_lineage. audit_events extended with old_state, new_state and nullable workspace_id, project_id, entity_id for template-center events.

Migrations: `17980202000000-TemplateCenterFoundation.ts`, `17980202100000-TemplateCenterIndexes.ts`.

RLS: Not used for template-center tables; tenant scope is enforced in services (Path B).

## MVP Safety Guarantees

- **Tenant isolation rule**: Project-scoped access requires `project.organization_id === auth.organizationId`. If `project.workspace_id` is not null, it must equal `auth.workspaceId` (or be in the user’s allowed workspaces). Violations return **403**, not 404.
- **Feature flag behavior**: When `TEMPLATE_CENTER_V1` is false, all Template Center endpoints (read and write) return **404**. When the flag is true, endpoints behave as documented.
- **Gate enforcement source of truth**: Gate blockers are derived from the applied template schema only (`template_lineage` + `template_versions.schema.gates[gateKey].requirements`). Required doc/KPI checks use `requiredDocKeys`, `requiredKpiKeys`, and `requiredDocStates` from that schema.
- **Evidence pack guarantees**: The evidence-pack response always includes `templateLineage` (or null), `documents` (docKey, state, version), `kpis` (kpiKey, latestValue), and `gates` (gateKey, decision, decidedAt). These arrays are never null; they are empty when no data exists. No null crashes when no KPIs or gates are recorded yet.
- **Rollback behavior**: Setting `TEMPLATE_CENTER_V1=false` and restarting the app hides all Template Center routes (404). No schema or data changes are required to roll back; re-enabling the flag restores access.
