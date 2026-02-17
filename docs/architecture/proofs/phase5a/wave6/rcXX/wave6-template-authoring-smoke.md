# Wave 6: Template Authoring Smoke Test

**Tag:** v0.6.0-rc.XX
**Date:** YYYY-MM-DD
**Environment:** Staging

## Pre-conditions

- Staging deployed with Wave 6 migration `17980251000000-UnifyTemplateSchemaOntoTemplates`
- System templates seeded in `templates` table
- User authenticated as org admin

## Test Steps

### 1. List templates (admin)

```
GET /api/admin/templates
```

- [ ] Returns system templates with `isSystem: true`, `isPublished: true`
- [ ] Returns org templates if any exist
- [ ] Each template has `deliveryMethod`, `defaultTabs`, `defaultGovernanceFlags`, `boundKpiCount`

### 2. Clone system template

```
POST /api/admin/templates/{scrum-system-id}/clone
```

- [ ] Returns new template with `isSystem: false`, `isPublished: false`, `templateScope: ORG`
- [ ] Name is "{original} (Copy)"
- [ ] KPI bindings copied (check via GET /admin/templates/{cloned-id}/kpis)

### 3. Edit cloned template

```
PATCH /api/admin/templates/{cloned-id}
Body: { "name": "Custom Scrum", "deliveryMethod": "SCRUM", "defaultTabs": ["overview", "board", "kpis"] }
```

- [ ] Returns updated template
- [ ] Cannot edit system template (returns 403)

### 4. Publish org template

```
POST /api/admin/templates/{cloned-id}/publish
```

- [ ] Returns template with `isPublished: true`, `publishedAt` set

### 5. Verify published templates endpoint

```
GET /api/templates/published
```

- [ ] Returns system templates
- [ ] Returns published org template
- [ ] Does NOT return unpublished org templates

### 6. Create project from published template

```
POST /api/admin/templates/{cloned-id}/apply
Body: { "name": "Test Project", "workspaceId": "..." }
```

- [ ] Project created with governance flags from template
- [ ] Tasks created from template
- [ ] KPIs auto-activated (check via GET /api/work/workspaces/.../projects/.../kpis/configs)

### 7. Unpublish org template

```
POST /api/admin/templates/{cloned-id}/unpublish
```

- [ ] Template no longer appears in published list
- [ ] Template still visible in admin list

### 8. Archive org template

```
DELETE /api/admin/templates/{cloned-id}
```

- [ ] Template marked as archived (isActive: false)
- [ ] Template no longer appears in admin list (unless "show archived" filter enabled)

## UI Verification

- [ ] Admin templates page shows Clone button on system templates
- [ ] Admin templates page shows Edit / Publish / Unpublish on org templates
- [ ] Edit modal shows delivery method, tabs, governance flags
- [ ] Project create modal uses published templates endpoint
- [ ] Published/Draft badges visible

## Proof Artifacts

- `staging-identity.txt`
- `staging-health.txt`
- `admin-templates-list.json`
- `clone-response.json`
- `publish-response.json`
- `published-list.json`
- `apply-project-response.json`
- `project-kpi-configs.json`
