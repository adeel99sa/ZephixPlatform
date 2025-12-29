# Phase 2 Endpoint Signoff Guide

## Prerequisites

1. **Server Running:**
   ```bash
   cd zephix-backend
   npm run start:dev
   ```
   - Server should be accessible at `http://localhost:3000`
   - Health endpoint: `http://localhost:3000/health`

2. **Valid ACCESS_TOKEN:**
   ```bash
   export ACCESS_TOKEN="your-jwt-token-here"
   ```

3. **Database State:**
   - Using existing database with baseline tables
   - Phase 2 tables should exist: `integration_connections`, `external_tasks`, `external_user_mappings`, `external_task_events`, `workspace_module_configs`

---

## Step 1: Run Smoke Tests

### Workspace Modules Smoke Test

```bash
cd zephix-backend
npm run smoke:workspace-modules 2>&1 | tee ../docs/smoke-proof-artifacts/02_smoke_workspace_modules.log
```

**Expected:** All tests pass, 404 for unknown moduleKey

### Integrations Smoke Test

```bash
cd zephix-backend
npm run smoke:integrations 2>&1 | tee ../docs/smoke-proof-artifacts/03_smoke_integrations.log
```

**Expected:** All tests pass, no secrets in responses

---

## Step 2: Capture Proof Artifacts

```bash
cd zephix-backend
export ACCESS_TOKEN="your-token-here"
./scripts/capture-smoke-proof.sh
```

**Expected Output Files:**
- `10_create_connection.request.json` (or similar)
- `11_create_connection.response.json`
- `12_list_connections.response.json`
- `13_test_connection.response.json`
- `14_sync_now_run1.response.json`
- `15_sync_now_run2.response.json`

---

## Step 3: Final Verification Checks

### Check 1: No Secrets in Responses

```bash
cd docs/smoke-proof-artifacts
grep -r "apiToken\|webhookSecret\|encryptedSecrets" *.json || echo "✅ No secrets found"
```

**Expected:** No matches (secrets should never appear)

### Check 2: All Responses Wrap { data: ... }

```bash
cd docs/smoke-proof-artifacts
for file in *.json; do
  echo "Checking $file..."
  jq 'has("data")' "$file" || echo "❌ $file missing data wrapper"
done
```

**Expected:** All files return `true`

### Check 3: Idempotency Verification

```bash
cd docs/smoke-proof-artifacts
ISSUES1=$(jq -r '.data.issuesProcessed // 0' 14_sync_now_run1.response.json)
ISSUES2=$(jq -r '.data.issuesProcessed // 0' 15_sync_now_run2.response.json)
echo "First run: $ISSUES1 issues"
echo "Second run: $ISSUES2 issues"
if [ "$ISSUES1" == "$ISSUES2" ]; then
  echo "✅ Idempotency PASS"
else
  echo "⚠️  Idempotency CHECK (may be expected if new issues exist)"
fi
```

**Expected:** Second run should have same or fewer issuesProcessed (idempotency working)

### Check 4: No organizationId in Request Body/Query

```bash
cd docs/smoke-proof-artifacts
grep -r "organizationId" *.json | grep -v "response.json" || echo "✅ No organizationId in requests"
```

**Expected:** No organizationId in request files (only in responses)

---

## Signoff Checklist

- [ ] Server boots without errors
- [ ] Smoke tests pass (workspace-modules and integrations)
- [ ] Proof artifacts captured
- [ ] No secrets in any response artifact
- [ ] All responses wrap in { data: ... }
- [ ] sync-now run2 shows idempotency (same or fewer issuesProcessed)
- [ ] No organizationId in request body/query

---

**Status:** Ready for execution once server is running and ACCESS_TOKEN is available.




