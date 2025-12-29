# Railway Frontend Settings Analysis

## ✅ Build Settings (Confirmed from Screenshot)

- **Builder:** Nixpacks (deprecated tag, but still functional)
- **Custom Build Command:** `npm run build` ✅
- **Providers:** Node.js ✅
- **Root Directory:** (Need to check in Source tab)

## ⚠️ Need to Check: Deploy Settings

The Build settings look correct, but the issue is with the **Start Command** in the **Deploy** tab.

### What to Check:

1. **Go to Deploy Tab:**
   - Railway → `zephix-frontend` → Settings → **Deploy** tab (in right sidebar)

2. **Check Start Command:**
   - If it says: `node server.cjs` or `node /app/server.cjs` → **DELETE IT**
   - Should be: **EMPTY** or `npm run start`

3. **Check Root Directory (Source Tab):**
   - Railway → `zephix-frontend` → Settings → **Source** tab
   - Should be: `zephix-frontend`

## Expected Configuration

### Source Tab:
- **Root Directory:** `zephix-frontend`
- **Branch:** `chore/hardening-baseline`

### Build Tab (Already Correct):
- **Builder:** Nixpacks
- **Custom Build Command:** `npm run build`

### Deploy Tab (Need to Check):
- **Start Command:** **EMPTY** (Nixpacks will use `npm run start` from package.json)
  - OR if required: `npm run start`

## Why It's Still Running `node server.cjs`

If Railway is still running `node /app/server.cjs`, it means:
1. **Start Command is set** in Deploy tab to `node server.cjs`
2. **OR** there's a cached deployment configuration

## Fix Steps

1. **Check Deploy Tab:**
   - Settings → Deploy
   - Look for "Start Command" field
   - Clear it or set to `npm run start`

2. **Verify Source Tab:**
   - Settings → Source
   - Root Directory: `zephix-frontend`

3. **Redeploy:**
   - Deployments tab → Redeploy latest
   - Watch logs - should see `npm run start` not `node server.cjs`

---

**Next:** Check the Deploy tab and share what Start Command is set to.

