# Template Entity Analysis - STOP CONDITION

**Issue:** Two competing template entities exist

---

## Entity 1: `Template` (template.entity.ts)
- Table: `templates`
- Used by:
  - `TemplatesService.createV1()` - Creates Template entity
  - `TemplatesService.listV1()` - Lists Template entities
  - Controller route: `POST /api/templates` → calls `createV1()`
  - Controller route: `GET /api/templates` → calls `listV1()`
- Has `version` field (line 703 in templates.service.ts shows `version: 1`)

## Entity 2: `ProjectTemplate` (project-template.entity.ts)
- Table: `project_templates`
- Used by:
  - `TemplatesService.create()` - Creates ProjectTemplate entity
  - `TemplatesService.findAll()` - Lists ProjectTemplate entities
  - `TemplatesInstantiateV51Service.instantiateV51()` - Uses ProjectTemplate
  - Controller route: `POST /api/templates/:templateId/instantiate-v5_1` → uses ProjectTemplate
- Does NOT have `version` field
- Has `scope` field (enum: 'organization', 'team', 'personal')

---

## Routes and Entities

| Route | Entity Used | Service Method |
|-------|-------------|----------------|
| `POST /api/templates` | `Template` | `createV1()` |
| `GET /api/templates` | `Template` | `listV1()` |
| `POST /api/templates/:id/instantiate-v5_1` | `ProjectTemplate` | `instantiateV51()` |

---

## Problem

1. **Creation uses `Template`** but **instantiation uses `ProjectTemplate`**
2. These are different tables with different schemas
3. Cannot determine which is authoritative
4. `Template` has `version` field, `ProjectTemplate` does not

---

## Files Involved

### Template Entity (templates table)
- `zephix-backend/src/modules/templates/entities/template.entity.ts`
- Used by: `TemplatesService.createV1()`, `TemplatesService.listV1()`

### ProjectTemplate Entity (project_templates table)
- `zephix-backend/src/modules/templates/entities/project-template.entity.ts`
- Used by: `TemplatesInstantiateV51Service.instantiateV51()`

---

## Question for Direction

**Which entity should be authoritative?**
- Option A: Use `Template` for everything (migrate instantiation to use Template)
- Option B: Use `ProjectTemplate` for everything (migrate creation/list to use ProjectTemplate)
- Option C: Keep both but clarify which is for what purpose

**STOPPING** as requested. Cannot proceed without direction on which entity is authoritative.
