# STOP CONDITION: Two Competing Template Entities

**Status:** Cannot proceed without direction

---

## Problem Identified

Two template entities exist and are used by different routes:

### Entity 1: `Template` (templates table)
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`
**Has version field:** ✅ Yes (line 96-97: `version: number` default 1)

**Used by:**
- `POST /api/templates` → `TemplatesController.create()` → `TemplatesService.createV1()` → Creates `Template`
- `GET /api/templates` → `TemplatesController.list()` → `TemplatesService.listV1()` → Lists `Template`

### Entity 2: `ProjectTemplate` (project_templates table)
**File:** `zephix-backend/src/modules/templates/entities/project-template.entity.ts`
**Has version field:** ❌ No

**Used by:**
- `POST /api/templates/:templateId/instantiate-v5_1` → `TemplatesInstantiateV51Service.instantiateV51()` → Uses `ProjectTemplate`

---

## Exact Files and Routes

### Routes Using `Template` Entity
1. `POST /api/templates`
   - Controller: `TemplatesController.create()` (line 105)
   - Service: `TemplatesService.createV1()` (line 669)
   - Entity: `Template` (line 690)

2. `GET /api/templates`
   - Controller: `TemplatesController.list()` (line 115)
   - Service: `TemplatesService.listV1()` (line 514)
   - Entity: `Template` (line 517)

### Routes Using `ProjectTemplate` Entity
1. `POST /api/templates/:templateId/instantiate-v5_1`
   - Controller: `TemplatesController.instantiateV51()` (line 367)
   - Service: `TemplatesInstantiateV51Service.instantiateV51()` (line 52)
   - Entity: `ProjectTemplate` (line 83, 91)

---

## Conflict

- **Creation** uses `Template` entity (has version field)
- **Instantiation** uses `ProjectTemplate` entity (no version field)
- These are **different database tables**
- Cannot determine which is authoritative

---

## Questions

1. **Which entity should be authoritative?**
   - Option A: Migrate everything to `Template` (has version)
   - Option B: Migrate everything to `ProjectTemplate` (used by instantiate-v5_1)
   - Option C: Keep both but clarify purpose

2. **Should instantiate-v5_1 use `Template` instead of `ProjectTemplate`?**

3. **Should create/list endpoints use `ProjectTemplate` instead of `Template`?**

---

**STOPPED** as requested. Cannot proceed with template versioning and scope changes without knowing which entity is authoritative.
