# Wave 4C — KPI UI Smoke Report

**RC Tag:** v0.6.0-rc.XX
**Date:** YYYY-MM-DD
**Tester:** (name)
**Backend:** zephix-backend-v2-staging.up.railway.app
**Frontend:** zephix-frontend-staging.up.railway.app

---

## 1. Prerequisites

- [ ] Backend deployed with Wave 4A/4B migrations applied
- [ ] Frontend deployed with Wave 4C changes

---

## 2. Global KPI Definitions Endpoint

**Request:**
```
GET /api/kpis/definitions
```

**Expected:** Returns list of 12 MVP KPI definitions scoped to org.

**Response (paste JSON):**
```json

```

- [ ] PASS / FAIL

---

## 3. Admin Template KPI Management

### 3a. List Template KPIs
**Request:**
```
GET /api/admin/templates/:templateId/kpis
```

**Response (paste JSON):**
```json

```

### 3b. Assign KPI to Template
**Request:**
```
POST /api/admin/templates/:templateId/kpis
Body: { kpiDefinitionId: "...", isRequired: true, defaultTarget: "20" }
```

**Response (paste JSON):**
```json

```

### 3c. Verify Template KPIs List After Assignment

**Response (paste JSON):**
```json

```

- [ ] PASS / FAIL

---

## 4. Project KPI Configs

**Request:**
```
GET /api/work/workspaces/:wsId/projects/:projId/kpis/config
```

**Expected:** Returns configs with kpiDefinition relation populated.

**Response (paste JSON):**
```json

```

- [ ] PASS / FAIL

---

## 5. Compute KPIs

**Request:**
```
POST /api/work/workspaces/:wsId/projects/:projId/kpis/compute
```

**Expected:** Returns `{ computed: [...], skipped: [...] }` with at least 1 computed and 1 skipped.

**Response (paste JSON):**
```json

```

- [ ] At least 1 computed value present
- [ ] At least 1 skipped KPI with reason and governanceFlag
- [ ] engineVersion present in computed value valueJson

- [ ] PASS / FAIL

---

## 6. UI Verification

### 6a. Admin Template KPIs Section
- [ ] "KPIs" button visible on template cards
- [ ] KPI manager modal opens and lists definitions
- [ ] Add KPI works with defaultTarget and isRequired
- [ ] Remove KPI works

### 6b. Project KPIs Tab
- [ ] KPIs tab appears in project tab navigation
- [ ] Table shows configured KPIs with columns: name, enabled, target, value, status
- [ ] Toggle enabled works (PATCH called)
- [ ] Target input with debounce works
- [ ] "Compute now" button triggers computation
- [ ] Skipped KPIs panel shows governance flag reasons
- [ ] Engine version and last computed timestamp displayed
- [ ] NO DATA status shown for KPIs without values
- [ ] Empty state rendered when no configs

---

## 7. Frontend Test Results

```
Test Files  2 passed (2)
     Tests  10 passed (10)
```

- [ ] PASS / FAIL

---

## 8. Summary

| Check                          | Status |
|-------------------------------|--------|
| Definitions endpoint           |        |
| Template KPI assign/remove     |        |
| Project KPI configs            |        |
| Compute returns computed+skip  |        |
| UI: Admin template KPIs       |        |
| UI: Project KPIs tab          |        |
| Frontend tests                 |        |

**Overall:** PASS / FAIL
