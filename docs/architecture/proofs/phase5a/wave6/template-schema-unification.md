# Template Schema Unification — Wave 6

## Decision

`templates` is the single source of truth for all template operations.

## Evidence

### Entity mapping

| Entity | Table | Status |
|--------|-------|--------|
| `Template` | `templates` | **ACTIVE — Single source of truth** |
| `ProjectTemplate` | `project_templates` | LEGACY / FROZEN — do not add features |

### FK chain

```
template_kpis.template_id  →  templates(id)  ON DELETE CASCADE
```

This FK was established in migration `17980250000000-CreateTemplateKpisTable.ts`:
```sql
template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE
```

### Migration history

| Migration | Table | Action |
|-----------|-------|--------|
| `17980251000000-UnifyTemplateSchemaOntoTemplates` | `templates` | Added `delivery_method`, `default_tabs`, `default_governance_flags`, `phases`, `task_templates`, `risk_presets`, `is_published` |

### Admin controller mapping (Wave 6)

| Endpoint | Service method | Entity |
|----------|----------------|--------|
| `GET /admin/templates` | `findAllUnified()` | `Template` |
| `GET /admin/templates/:id` | `findOneUnified()` | `Template` |
| `POST /admin/templates` | `createUnified()` | `Template` |
| `POST /admin/templates/:id/clone` | `cloneSystemTemplateToOrg()` | `Template` |
| `POST /admin/templates/:id/publish` | `publishTemplate()` | `Template` |
| `POST /admin/templates/:id/unpublish` | `unpublishTemplate()` | `Template` |
| `PATCH /admin/templates/:id` | `updateOrgTemplate()` | `Template` |
| `POST /admin/templates/:id/apply` | `applyTemplateUnified()` | `Template` |
| `DELETE /admin/templates/:id` | `archiveUnified()` | `Template` |

### Seed script

`src/scripts/seed-system-templates.ts` creates records in `templates` table with:
- `templateScope: 'SYSTEM'`
- `organizationId: null` (system templates are global)
- `isPublished: true`
- KPI bindings in `template_kpis` correctly reference `templates(id)`

### Data reconciliation (Option A — MVP)

The `project_templates` table remains in the database as **read-only legacy**.
- No API endpoint reads from or writes to `project_templates`.
- Admin UI and published templates endpoint exclusively use `templates`.
- Legacy methods in `TemplatesService` are marked `@deprecated`.
- Future: migrate any needed records from `project_templates` to `templates`, then drop the legacy table.

### Legacy freeze enforcement

All legacy methods on `TemplatesService` that operate on `ProjectTemplate` are marked `@deprecated`:
- `create()` -> use `createUnified()`
- `findAll()` -> use `findAllUnified()`
- `findOne()` -> use `findOneUnified()`
- `applyTemplate()` -> use `applyTemplateUnified()`

No admin controller route calls these legacy methods.
