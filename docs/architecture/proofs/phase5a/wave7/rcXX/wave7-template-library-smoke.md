# Wave 7: Template Library Expansion — Staging Smoke

**Tag**: v0.6.0-rc.XX
**Date**: YYYY-MM-DD
**Tester**: ___

## Pre-conditions

- Wave 6 deployed and verified
- Seed script executed: `TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts`
- 12 system templates created in `templates` table
- `template_code` column populated for all system templates

---

## 1. List Admin Templates — Confirm 12

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates" | jq '.data | length'
```

**Expected**: `12` (or more if org templates exist)
**Actual**: ___

### Group by delivery method

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates" | jq '[.data[] | select(.isSystem == true)] | group_by(.deliveryMethod) | map({method: .[0].deliveryMethod, count: length})'
```

**Expected**:
```json
[
  {"method": "HYBRID", "count": 3},
  {"method": "KANBAN", "count": 3},
  {"method": "SCRUM", "count": 3},
  {"method": "WATERFALL", "count": 3}
]
```
**Actual**: ___

---

## 2. Template Details — Verify Lego Bundle

Pick one template from each delivery method and verify all bundle fields present.

### 2a. Scrum Software Delivery

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates/$SCRUM_TPL_ID" | jq '{name, templateCode, deliveryMethod, defaultTabs, defaultGovernanceFlags, phases: (.phases | length), taskTemplates: (.taskTemplates | length), boundKpiCount}'
```

**Expected**: `deliveryMethod: "SCRUM"`, `defaultTabs` includes `["overview","tasks","board","kpis","risks"]`, `iterationsEnabled: true`, phases >= 3, tasks >= 5
**Actual**: ___

### 2b. Waterfall Infrastructure Migration

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates/$WATERFALL_TPL_ID" | jq '{name, templateCode, deliveryMethod, defaultTabs, defaultGovernanceFlags, phases: (.phases | length), taskTemplates: (.taskTemplates | length), riskPresets: (.riskPresets | length), boundKpiCount}'
```

**Expected**: `baselinesEnabled: true`, `costTrackingEnabled: true`, phases = 5, riskPresets = 3
**Actual**: ___

### 2c. Hybrid M&A Integration

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates/$HYBRID_TPL_ID" | jq '{name, templateCode, deliveryMethod, defaultGovernanceFlags, riskPresets: (.riskPresets | length)}'
```

**Expected**: `costTrackingEnabled: true`, `changeManagementEnabled: true`, riskPresets = 4
**Actual**: ___

---

## 3. Clone, Edit, Publish

### 3a. Clone a Scrum template

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates/$SCRUM_TPL_ID/clone" | jq '{id, name, isSystem, isPublished}'
```

**Expected**: `isSystem: false`, `isPublished: false` (draft)
**Actual**: ___

### 3b. Edit the clone

```bash
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Custom Scrum - Our Team", "defaultTabs": ["overview", "tasks", "board", "kpis"]}' \
  "$BASE_URL/api/admin/templates/$CLONE_ID" | jq '{id, name, defaultTabs}'
```

**Expected**: Updated name and tabs
**Actual**: ___

### 3c. Publish the clone

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/templates/$CLONE_ID/publish" | jq '{isPublished}'
```

**Expected**: `isPublished: true`
**Actual**: ___

### 3d. Verify published list includes both system and custom

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/templates/published" | jq '.data | length'
```

**Expected**: >= 13 (12 system + 1 custom)
**Actual**: ___

---

## 4. Create Projects From Templates — 4 Methods

### 4a. Create project from Scrum template

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Smoke Scrum Project", "workspaceId": "'$WS_ID'"}' \
  "$BASE_URL/api/admin/templates/$SCRUM_TPL_ID/apply" | jq '{data: {id, name}}'
```

**Verify**: Project created, governance flags applied, KPI configs auto-activated

### 4b. Create project from Waterfall template

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Smoke Waterfall Project", "workspaceId": "'$WS_ID'"}' \
  "$BASE_URL/api/admin/templates/$WATERFALL_TPL_ID/apply" | jq '{data: {id, name}}'
```

### 4c. Create project from Kanban template

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Smoke Kanban Project", "workspaceId": "'$WS_ID'"}' \
  "$BASE_URL/api/admin/templates/$KANBAN_TPL_ID/apply" | jq '{data: {id, name}}'
```

### 4d. Create project from Hybrid template

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Smoke Hybrid Project", "workspaceId": "'$WS_ID'"}' \
  "$BASE_URL/api/admin/templates/$HYBRID_TPL_ID/apply" | jq '{data: {id, name}}'
```

---

## 5. Compute KPIs — Verify Governance Gating

### 5a. Scrum project — velocity requires iterationsEnabled

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BASE_URL/api/work/workspaces/$WS_ID/projects/$SCRUM_PROJ_ID/kpis/compute" | jq '{computed: (.data.computed | length), skipped: [.data.skipped[] | {kpiCode, reason, governanceFlag}]}'
```

**Expected**: velocity computed (iterationsEnabled is true), throughput computed (no flag), budget_burn skipped (costTrackingEnabled is false)
**Actual**: ___

### 5b. Waterfall project — all EVM KPIs should compute

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BASE_URL/api/work/workspaces/$WS_ID/projects/$WATERFALL_PROJ_ID/kpis/compute" | jq '{computed: (.data.computed | length), skipped: (.data.skipped | length)}'
```

**Expected**: 4 computed (all governance flags enabled), 0 skipped
**Actual**: ___

---

## 6. Seed Idempotency

Run seed script a second time:

```bash
TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts
```

**Expected**: "already exists" for all 12, 0 new bindings
**Actual**: ___

---

## Summary

| Check | Status |
|-------|--------|
| 12 system templates visible | |
| 3 per delivery method | |
| All tabs valid | |
| All governance flags complete (7 per template) | |
| Clone/edit/publish flow works | |
| Published list shows system + custom | |
| Project creation from each method works | |
| KPI governance gating correct | |
| Seed idempotent on re-run | |
| templateCode unique index enforced | |
