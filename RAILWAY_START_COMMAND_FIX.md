# Railway Start Command Fix - Complete Guide

## Root Cause

Railway's **Custom Start Command** in Deploy settings overrides Nixpacks. Even though Nixpacks builds correctly, if a start command is set, Railway uses it instead of `npm run start` from package.json.

## Complete Fix Steps

### 1. Clear Custom Start Command
**Railway → zephix-frontend → Settings → Deploy:**
- Find "Custom Start Command" or "Start Command" field
- **Clear it completely** (make it empty)
- Save

### 2. Check Config-as-Code
**Railway → zephix-frontend → Settings → Config-as-code:**
- Check if Config-as-code is enabled
- If enabled, check for any `start` command in the config
- Either remove the start command from config OR disable Config-as-code for this service

### 3. Verify No Config Files in Repo
Checked repo for:
- ✅ No `railway.json` found
- ✅ No `railway.toml` found
- ✅ No `.railway/` directory found
- ✅ No hardcoded start commands in code

### 4. Redeploy
- Go to Deployments tab
- Click **Redeploy** on latest deployment
- Watch logs for correct startup

## What Success Looks Like

### In Deployment Logs:
```
Node version: v22.12.0 (or v22.x.x)
> zephix-frontend@0.1.0 start
> vite preview --host 0.0.0.0 --port 8080

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://0.0.0.0:8080/
  ➜  press h + enter to show help
```

### What to NOT See:
- ❌ `node server.cjs`
- ❌ `node /app/server.cjs`
- ❌ `Error: Cannot find module '/app/server.cjs'`
- ❌ Any reference to `server.cjs`

## Current Configuration

**package.json start script:**
```json
"start": "vite preview --host 0.0.0.0 --port $PORT"
```

**nixpacks.toml:**
```toml
[start]
cmd = "npm run start"
```

Both are correct. The issue is Railway's Deploy settings override.

## If It Still Fails After Clearing

Check these locations in Railway:
1. **Service Settings → Deploy → Custom Start Command** (should be empty)
2. **Service Settings → Config-as-code** (should be disabled or not set)
3. **Project Settings** (check if project-level start command exists)
4. **Service Template** (if service was created from template, check template settings)

## Validation Checklist

After redeploy, verify:
- [ ] Logs show `npm run start` (not `node server.cjs`)
- [ ] Logs show `vite preview --host 0.0.0.0 --port 8080`
- [ ] No `server.cjs` errors
- [ ] Vite prints "Local:" and "Network:" URLs
- [ ] Service stays up and responds

---

**Status:** Code is correct. Railway UI setting needs to be cleared.


