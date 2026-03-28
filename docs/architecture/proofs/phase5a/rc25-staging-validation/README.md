# rc.25 Staging Validation — Proof Directory

## Context

This directory holds staging validation proofs for `v0.6.0-rc.25`, which includes:

- **Backfill migration** (`18000000000011`): fixes `kpi_definitions.rollup_method` NULL constraint violation
- **Guard fix**: `RequireWorkspaceAccessGuard` now handles `read` and `write` access modes
- **Entity alignment**: `KpiDefinitionEntity` columns marked non-nullable with defaults

## Validation Order

After deploying rc.25 to staging:

### Step 1: Verify migration applied

```bash
# Confirm migration ran
curl -s "$BASE_URL/health/ready" | jq .

# Null check query (must return 0)
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS null_count FROM kpi_definitions WHERE rollup_method IS NULL OR time_window IS NULL OR direction IS NULL;"
```

Save output to `rc25-migration-proof.txt`.

### Step 2: Run Waves 4A-4D smokes

```bash
export BASE_URL=https://zephix-backend-v2-staging.up.railway.app/api
export SMOKE_TOKEN=<admin-jwt>

bash scripts/smoke/wave4a-kpi-smoke.sh "$BASE_URL"
bash scripts/smoke/wave4b-template-kpi-smoke.sh "$BASE_URL"
bash scripts/smoke/wave4c-kpi-ui-smoke.sh "$BASE_URL"
bash scripts/smoke/wave4d-kpi-packs-smoke.sh "$BASE_URL"
```

Save outputs to `wave4a-rc25.txt`, `wave4b-rc25.txt`, `wave4c-rc25.txt`, `wave4d-rc25.txt`.

### Step 3: Run template seed on staging

```bash
NODE_ENV=staging TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/template-center/seed-system-templates.ts
```

Save output to `seed-proof.txt`.

### Step 4: Run Waves 5-7 smokes

```bash
bash scripts/smoke/wave5-template-library-smoke.sh "$BASE_URL"
bash scripts/smoke/wave6-template-authoring-smoke.sh "$BASE_URL"
bash scripts/smoke/wave7-template-library-smoke.sh "$BASE_URL"
```

Save outputs to `wave5-rc25.txt`, `wave6-rc25.txt`, `wave7-rc25.txt`.

### Step 5: Run Wave 8 smoke

```bash
bash scripts/smoke/wave8-portfolio-rollup-smoke.sh "$BASE_URL"
```

Save output to `wave8-rc25.txt`.

### Step 6: Gate check

All waves must show 0 FAIL before proceeding to merge Wave 9 and Wave 10.

## Proof Files (to be populated after staging run)

| File | Contents | Status |
|------|----------|--------|
| `rc25-migration-proof.txt` | Migration applied + null check | PENDING |
| `wave4a-rc25.txt` | KPI foundation smoke | PENDING |
| `wave4b-rc25.txt` | Template-KPI binding smoke | PENDING |
| `wave4c-rc25.txt` | KPI UI smoke | PENDING |
| `wave4d-rc25.txt` | KPI packs smoke | PENDING |
| `seed-proof.txt` | Template seed output | PENDING |
| `wave5-rc25.txt` | Template library smoke | PENDING |
| `wave6-rc25.txt` | Template authoring smoke | PENDING |
| `wave7-rc25.txt` | Template library expansion smoke | PENDING |
| `wave8-rc25.txt` | Portfolio/program rollup smoke | PENDING |
