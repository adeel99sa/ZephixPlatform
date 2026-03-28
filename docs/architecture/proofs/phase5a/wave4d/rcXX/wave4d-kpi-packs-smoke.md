# Wave 4D — KPI Packs Smoke Report

**RC Tag:** v0.6.0-rc.XX
**Date:** YYYY-MM-DD
**Tester:** (name)
**Backend:** zephix-backend-v2-staging.up.railway.app
**Frontend:** zephix-frontend-staging.up.railway.app

---

## 1. Prerequisites

- [ ] Backend deployed with Wave 4A/4B/4C/4D changes
- [ ] Frontend deployed with Wave 4D changes

---

## 2. List Available Packs

**Request:**
```
GET /api/admin/templates/:templateId/kpis/packs
```

**Expected:** Returns 4 packs: scrum_core, kanban_flow, waterfall_evm, hybrid_core.

**Response (paste JSON):**
```json

```

- [ ] PASS / FAIL

---

## 3. Apply scrum_core Pack to Template

**Request:**
```
POST /api/admin/templates/:templateId/kpis/packs/scrum_core/apply
```

**Expected:** Returns template KPIs list with velocity, throughput, wip, escaped_defects.

**Response (paste JSON):**
```json

```

- [ ] 4 bindings returned
- [ ] velocity has isRequired: true, defaultTarget: "30"
- [ ] wip has isRequired: true, defaultTarget: "10"

- [ ] PASS / FAIL

---

## 4. Idempotency — Apply Same Pack Again

**Request:**
```
POST /api/admin/templates/:templateId/kpis/packs/scrum_core/apply
```

**Expected:** Same result, no duplicates. Count unchanged.

**Response (paste JSON):**
```json

```

- [ ] Same count as before (4)
- [ ] No duplicate entries

- [ ] PASS / FAIL

---

## 5. Create Project from Template

**Request:**
```
POST /api/work/workspaces/:wsId/projects
Body: { name: "KPI Pack Test Project", templateId: "...", ... }
```

**Expected:** Project created. KPI configs auto-activated from template.

---

## 6. Verify Auto-Activated KPIs

**Request:**
```
GET /api/work/workspaces/:wsId/projects/:projId/kpis/config
```

**Expected:** Configs exist for all 4 pack KPIs (velocity, throughput, wip, escaped_defects), all enabled.

**Response (paste JSON):**
```json

```

- [ ] 4 configs present
- [ ] All enabled
- [ ] velocity has target { value: 30 }
- [ ] wip has target { value: 10 }

- [ ] PASS / FAIL

---

## 7. Reject Unknown Pack

**Request:**
```
POST /api/admin/templates/:templateId/kpis/packs/nonexistent_pack/apply
```

**Expected:** 400 with code UNKNOWN_KPI_PACK.

- [ ] PASS / FAIL

---

## 8. UI Verification

### 8a. Admin Template KPI Manager
- [ ] "Apply KPI pack..." dropdown visible in modal
- [ ] Selecting "Agile Scrum Core (4 KPIs)" triggers apply
- [ ] KPI list updates immediately after pack apply
- [ ] Pack can be applied again without errors (idempotent)

### 8b. Project KPIs Tab (after template-based project creation)
- [ ] All pack KPIs appear in KPIs tab
- [ ] Compute produces values for applicable KPIs

---

## 9. Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Backend KPI tests | 94 | PASS |
| Backend app.module.compile | 4 | PASS |
| Frontend KPI tests | 12 | PASS |

---

## 10. Summary

| Check                                  | Status |
|---------------------------------------|--------|
| Pack definitions (4 packs)             |        |
| Apply pack endpoint                    |        |
| Idempotency                           |        |
| Auto-activation on project creation    |        |
| Unknown pack rejection                 |        |
| UI: Pack dropdown                     |        |
| UI: Project KPIs after pack           |        |

**Overall:** PASS / FAIL
