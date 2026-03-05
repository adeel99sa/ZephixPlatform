# Security CLI Usage Policy

Operational guide for inspecting Railway environment variables safely.

---

## Variable Inspection

### Allowed pattern

Use the safe wrapper at all times:

```bash
bash scripts/security/railway-vars-safe.sh
bash scripts/security/railway-vars-safe.sh --filter JWT
```

This prints **key names only**. Values are never written to terminal output or log files.

To capture the key list as a proof artifact:

```bash
railway variables --json | jq 'map(.key)' > docs/architecture/proofs/staging/rotated-secret-keys.json
```

### Forbidden pattern

Never run `railway variables` without value filtering:

```bash
# FORBIDDEN — prints all values to terminal
railway variables

# FORBIDDEN — pipes full values to any log or file
railway variables --json > vars.json

# FORBIDDEN — prints a specific secret value
echo $JWT_SECRET
echo $SENDGRID_API_KEY
```

---

## Why

Unfiltered `railway variables` output contains live secret values. Terminal sessions may be recorded, logged, or visible in screen shares. Secret values printed to stdout create a leak surface even when not committed to the repo.

---

## Secret Rotation Procedure

1. Rotate in Railway dashboard for `zephix-backend-staging` service.
2. Update corresponding GitHub Secrets if the key is used in workflows.
3. Capture key list (not values) as proof:
   ```bash
   railway variables --json | jq 'map(.key)' > docs/architecture/proofs/staging/rotated-secret-keys.json
   ```
4. Verify with safe wrapper to confirm keys are present:
   ```bash
   bash scripts/security/railway-vars-safe.sh
   ```

---

## Deploy Traceability

Always inject `COMMIT_SHA` explicitly when deploying staging:

```bash
COMMIT_SHA=$(git rev-parse HEAD) railway up
```

Never deploy without the prefix — Railway does not always inject `RAILWAY_GIT_COMMIT_SHA` automatically.

---

## Leak Detection

Run the leak check before any commit touching scripts or workflows:

```bash
bash scripts/security/check-secret-leak.sh
```

This script fails if any forbidden patterns are found in `scripts/` or `.github/`.
