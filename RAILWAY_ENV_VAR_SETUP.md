# Railway Environment Variable Setup - INTEGRATION_ENCRYPTION_KEY

## Generated Key

**Generated Key:** (see output below)

## Exact Steps to Add in Railway

### 1. Navigate to Correct Location
- **Railway Project:** Zephix Application
- **Environment:** production (check top selector)
- **Service:** zephix-backend (NOT frontend, NOT postgres)
- **Tab:** Variables

### 2. Add Variable
- Click **+ New Variable** or **Add Variable**
- **Key:** `INTEGRATION_ENCRYPTION_KEY` (exact match, no spaces)
- **Value:** Paste the generated key (no quotes)
- Click **Add** or **Save**

### 3. Verify Variable Scope
**Critical:** The variable must be:
- ✅ Under `zephix-backend` service (not project level)
- ✅ Under `production` environment (not staging)
- ✅ Visible in Variables tab for `zephix-backend` service

### 4. Force Redeploy
- Go to `zephix-backend` service
- Click **Deployments** tab
- Click **Redeploy** on the latest deployment
- Wait for deployment to complete

### 5. Verify in Logs
- Go to `zephix-backend` service → **Deployments** tab
- Click on the newest deployment
- Check logs - should NOT see: "Missing Good. Build side is fixed.

Your log proves Nixpacks is installing nodejs_22. Vite will stop complaining.

Now the remaining frontend error, missing /app/server.cjs, comes from Railway service settings, not from code.

Root cause
Railway zephix-frontend still has a Custom Start Command set to:
node server.cjs
So even though Nixpacks builds your app, Railway overrides startup and tries to run a file you removed.

Fix in Railway UI

1. Open Railway, zephix-frontend, production
2. Settings, Deploy
3. Custom Start Command
4. Clear it completely so it is empty
5. Save
6. Redeploy

What success looks like in logs

1. It prints: > zephix-frontend@... start
2. It runs: vite preview --host 0.0.0.0 --port 8080
3. No server.cjs error
4. Service stays up

Quick verification
After redeploy, paste these lines from the frontend logs:

1. The Node version line
2. The exact start command line
3. The first line where Vite prints the URL or “Listening” output
INTEGRATION_ENCRYPTION_KEY"
- Should see successful startup

## Common Mistakes

❌ **Wrong Service:** Added to `zephix-frontend` or `postgres`
❌ **Wrong Environment:** Added to `staging` instead of `production`
❌ **Project Level:** Added at project level instead of service level
❌ **Typo in Name:** `INTEGRATION_ENCRYPTION_KEY` vs `INTEGRATION_ENCRYPTION_KEY ` (extra space)
❌ **Quotes:** Added quotes around value
❌ **No Redeploy:** Added variable but didn't redeploy

## Verification Checklist

- [ ] Variable added to `zephix-backend` service
- [ ] Variable added to `production` environment
- [ ] Key name is exactly: `INTEGRATION_ENCRYPTION_KEY`
- [ ] Value is at least 32 characters (base64 will be 44 chars)
- [ ] No quotes around value
- [ ] Redeployed after adding variable
- [ ] Logs show no "Missing" error

---

**After setup, paste first 30 lines of backend logs for verification.**

