# Wave 5 — Template Library & Seeding Smoke Report

**RC Tag:** v0.6.0-rc.XX
**Date:** YYYY-MM-DD
**Tester:** (name)
**Backend:** zephix-backend-v2-staging.up.railway.app
**Frontend:** zephix-frontend-staging.up.railway.app

---

## 1. Prerequisites

- [ ] Backend deployed with Wave 5 migration and seed
- [ ] Frontend deployed with Wave 5 UI changes
- [ ] Seed script run: `TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts`

---

## 2. Verify System Templates Exist

**Request:**
```
GET /api/admin/templates
```

**Expected:** 4 system templates returned with delivery methods.

**Checklist:**
- [ ] Scrum Project (deliveryMethod: SCRUM, boundKpiCount: 4)
- [ ] Kanban Project (deliveryMethod: KANBAN, boundKpiCount: 4)
- [ ] Waterfall Project (deliveryMethod: WATERFALL, boundKpiCount: 4)
- [ ] Hybrid Project (deliveryMethod: HYBRID, boundKpiCount: 5)

**Response (paste JSON):**
```json

```

- [ ] PASS / FAIL

---

## 3. Verify Template Preview Data

For each system template, confirm these fields are present:
- [ ] `deliveryMethod` — non-null for all 4
- [ ] `defaultTabs` — array of tab IDs
- [ ] `defaultGovernanceFlags` — object with boolean values
- [ ] `boundKpiCount` — matches pack binding count
- [ ] `phases` — non-empty array

---

## 4. Create Project from Scrum Template

**Request:**
```
POST /api/admin/templates/:scrumTemplateId/apply
Body: { "name": "Scrum Test Project", "workspaceId": "..." }
```

**Expected:** Project created with iterationsEnabled: true.

**Verify KPI auto-activation:**
```
GET /api/work/workspaces/:wsId/projects/:projId/kpis/config
```

- [ ] velocity config exists, enabled
- [ ] throughput config exists, enabled
- [ ] wip config exists, enabled
- [ ] escaped_defects config exists, enabled

---

## 5. Create Project from Kanban Template

**Verify KPI auto-activation:**
- [ ] cycle_time config exists, enabled
- [ ] throughput config exists, enabled
- [ ] wip config exists, enabled
- [ ] open_risk_count config exists, enabled

---

## 6. Create Project from Waterfall Template

**Verify:**
- [ ] costTrackingEnabled: true on project
- [ ] baselinesEnabled: true on project
- [ ] changeManagementEnabled: true on project

**Verify KPI auto-activation:**
- [ ] schedule_variance, spi, budget_burn, forecast_at_completion configs exist

---

## 7. Create Project from Hybrid Template

**Verify:**
- [ ] iterationsEnabled: true
- [ ] costTrackingEnabled: true
- [ ] changeManagementEnabled: true

**Verify KPI auto-activation:**
- [ ] cycle_time, budget_burn, forecast_at_completion, open_risk_count, change_request_approval_rate

---

## 8. Compute KPIs for Each Project

Run compute for each project and verify:
- [ ] Computed values returned (may be null for missing data)
- [ ] Skipped KPIs include governance reasons
- [ ] Deterministic sorted order (by kpiCode)
- [ ] engineVersion present in valueJson

---

## 9. UI Verification

### 9a. Admin Templates Page
- [ ] Delivery method badges visible (Scrum, Kanban, Waterfall, Hybrid)
- [ ] KPI count badges visible
- [ ] Tab count badges visible
- [ ] KPI manager still works (Apply pack dropdown visible)

### 9b. Project Create Modal
- [ ] Templates grouped by delivery method in optgroups
- [ ] KPI count shown in option labels
- [ ] Description shown when template selected
- [ ] "Start from scratch" still works

### 9c. Project KPIs Tab (after template-based creation)
- [ ] KPIs visible in tab immediately after creation
- [ ] Compute now works
- [ ] Correct governance-based skipping

---

## 10. Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Backend KPI tests | 112 | |
| System template definitions | 19 | |
| App module compile | 4 | |
| Frontend KPI tests | 12 | |

---

## 11. Summary

| Check | Status |
|-------|--------|
| 4 system templates seeded | |
| delivery_method column populated | |
| KPI packs bound to templates | |
| Template preview returns full metadata | |
| UI: Method badges | |
| UI: Grouped template selector | |
| Projects from all 4 templates | |
| KPIs auto-activated per template | |
| Compute runs without errors | |

**Overall:** PASS / FAIL
