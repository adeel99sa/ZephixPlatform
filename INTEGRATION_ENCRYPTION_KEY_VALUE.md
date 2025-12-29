# INTEGRATION_ENCRYPTION_KEY Value

## Generated Key

**Copy this exact value (no quotes, no spaces):**

```
8ohFlanGOVaHkU1RMXjmyZi/mD9aI61sX3hmr8HC97I=
```

## How to Add in Railway

1. **In the Variables tab** (where you are now):
   - Left field: `INTEGRATION_ENCRYPTION_KEY` (already filled)
   - Right field: Paste: `8ohFlanGOVaHkU1RMXjmyZi/mD9aI61sX3hmr8HC97I=`
   - Click **Add** button

2. **Important:**
   - ✅ No quotes around the value
   - ✅ No spaces before or after
   - ✅ Copy the entire string including the `=` at the end
   - ✅ Must be exactly 44 characters

3. **After Adding:**
   - Click **Add** button
   - Variable will appear in the list
   - **Redeploy** the backend service (Deployments tab → Redeploy)

## Verification

After adding and redeploying, check logs:
- Should NOT see: "Missing INTEGRATION_ENCRYPTION_KEY"
- Should see: Successful startup

---

**Key Details:**
- **Length:** 44 characters (32 bytes base64 encoded)
- **Algorithm:** AES-256-GCM (requires 32 bytes = 256 bits)
- **Security:** Never commit to git, store only in Railway Variables

