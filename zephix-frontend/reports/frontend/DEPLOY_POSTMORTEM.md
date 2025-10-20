# Railway Frontend Deploy Postmortem

**Date:** October 18, 2024  
**Issue:** Frontend Railway deployment failing with Nixpacks build errors  
**Resolution:** Removed custom builder configurations to enable Nixpacks auto-detect

## Root Cause Analysis

### Primary Issues Identified

1. **Custom Nixpacks Configuration**: `zephix-frontend/nixpacks.toml` contained invalid Nix package reference
   - **Problem**: `nixPkgs = ["nodejs_20", "npm"]` - `npm` is not a valid Nix package
   - **Impact**: Caused "undefined variable 'npm'" error during setup phase

2. **Railway Builder Override**: `zephix-frontend/railway.toml` forced custom build configuration
   - **Problem**: `builder = "nixpacks"` with `nixpacksConfigPath = "nixpacks.toml"`
   - **Impact**: Prevented Railway from using auto-detect capabilities

3. **Incomplete Preview Command**: Missing host/port binding parameters
   - **Problem**: `"preview": "vite preview"` without `--host 0.0.0.0 --port $PORT`
   - **Impact**: Service would not bind to Railway's assigned port

## Solution Applied

### Files Removed
- `zephix-frontend/railway.toml` - Removed custom Railway configuration
- `zephix-frontend/nixpacks.toml` - Removed invalid Nixpacks configuration

### Files Modified
- `zephix-frontend/package.json` - Updated preview script:
  ```json
  "preview": "vite preview --host 0.0.0.0 --port $PORT"
  ```

## Expected Behavior After Fix

### Build Process
1. **Setup Phase**: `nodejs_20` (auto-detected, no custom packages)
2. **Install Phase**: `npm ci` (standard Node.js package manager)
3. **Build Phase**: `npm run build` (TypeScript compilation + Vite build)
4. **Start Phase**: `npm run preview --host 0.0.0.0 --port $PORT` (Vite preview server)

### Key Success Indicators
- ✅ No "undefined variable 'npm'" errors
- ✅ Nixpacks auto-detects Node.js/Vite project
- ✅ Service binds to Railway's assigned port
- ✅ Frontend accessible via Railway domain

## Prevention Guidelines

### Do NOT Reintroduce These Files
- `railway.toml` in frontend directory (unless explicitly switching to Docker)
- `nixpacks.toml` with custom Nix packages (unless absolutely necessary)
- `Dockerfile` in frontend directory (unless explicitly requested)

### Keep These Files Allowed
- `package.json` and `package-lock.json` (required for auto-detect)
- `vite.config.*` (required for Vite detection)
- `tsconfig*.json` (required for TypeScript detection)
- `index.html` (required for SPA detection)
- `src/**` and `dist/**` (required for build process)

### When Custom Builders Are Needed
- Only introduce custom configurations when explicitly requested
- Test Nix package names before adding to `nixpacks.toml`
- Use Railway's auto-detect as the default approach
- Document any custom build requirements clearly

## Verification Commands

```bash
# Verify no custom builder files exist
ls -la zephix-frontend/ | grep -E '(railway\.toml|nixpacks\.toml|Dockerfile)'

# Verify preview script is correct
cat zephix-frontend/package.json | jq '.scripts.preview'

# Expected output: "vite preview --host 0.0.0.0 --port $PORT"
```

## Lessons Learned

1. **Railway Auto-Detect is Robust**: Nixpacks can reliably detect Node.js/Vite projects without custom configuration
2. **Custom Configs Add Complexity**: Only use when auto-detect fails or specific requirements exist
3. **Nix Package Names Matter**: Always verify package names before adding to `nixPkgs` array
4. **Port Binding is Critical**: Always bind to `0.0.0.0` and use `$PORT` environment variable for Railway

## Status

✅ **RESOLVED** - Frontend deployment should now work with Nixpacks auto-detect
