# Template API Proofs Setup - Complete

## ✅ Deliverables Created

### 1. Dev Seed Script
**File:** `zephix-backend/src/scripts/dev-seed.ts`
- Creates organization "Template Proofs Organization"
- Creates 3 users: Admin, Workspace Owner, Member
- Creates workspace "Template Proofs Workspace"
- Sets up workspace memberships
- Generates JWT tokens for all users
- Prints tokens and IDs for use in proof capture script

**Usage:**
```bash
cd zephix-backend
npm run dev-seed
```

### 2. Proof Capture Script
**File:** `zephix-backend/scripts/capture-template-proofs.sh`
- Captures 8 API proofs as specified
- Saves raw requests and responses to `proofs/templates/`
- Redacts tokens in request logs
- Prints summary with status codes

**Usage:**
```bash
cd zephix-backend
export ADMIN_TOKEN="..."
export OWNER_TOKEN="..."
export MEMBER_TOKEN="..."
export WORKSPACE_ID="..."
./scripts/capture-template-proofs.sh
```

### 3. Proofs Directory Structure
- `zephix-backend/proofs/templates/.gitkeep` - Ensures directory is tracked
- `zephix-backend/proofs/templates/README.txt` - Instructions for running proofs
- `.gitignore` updated to ignore generated proof files

### 4. Package.json Script
- Added `dev-seed` script to package.json

## 📋 Next Steps to Run Proofs

### Step 1: Verify Database and Migration
```bash
cd zephix-backend

# Check .env has DATABASE_URL
grep DATABASE_URL .env

# Run migration
npm run migration:run

# Verify columns
psql "$DATABASE_URL" -c "\d+ templates"
psql "$DATABASE_URL" -c "select template_scope, count(*) from templates group by template_scope;"
psql "$DATABASE_URL" -c "select count(*) from templates where template_scope='WORKSPACE' and workspace_id is null;"
```

### Step 2: Run Dev Seed
```bash
cd zephix-backend
npm run dev-seed
```

Copy the output:
- ADMIN_TOKEN
- OWNER_TOKEN
- MEMBER_TOKEN
- ORG_ID
- WORKSPACE_ID

### Step 3: Start Backend
```bash
cd zephix-backend
npm run start:dev
```

Verify health:
```bash
curl http://localhost:3001/api/health
```

### Step 4: Capture Proofs
```bash
cd zephix-backend
export ADMIN_TOKEN="<from step 2>"
export OWNER_TOKEN="<from step 2>"
export MEMBER_TOKEN="<from step 2>"
export WORKSPACE_ID="<from step 2>"
export API_BASE="http://localhost:3001/api"

./scripts/capture-template-proofs.sh
```

### Step 5: Review Outputs
Check `proofs/templates/` for:
- `*.request.txt` - Request details (tokens redacted)
- `*.response.txt` - Full HTTP responses

## ✅ Expected Status Codes

1. `01_admin_create_org_template_no_workspace_header` → **201**
2. `02_owner_create_workspace_template_with_header` → **201**
3. `03_member_create_template_forbidden` → **403**
4. `04_list_templates_no_workspace_header` → **200** (SYSTEM + ORG only)
5. `05_list_templates_with_workspace_header` → **200** (SYSTEM + ORG + WORKSPACE)
6. `06_publish_org_template_first` → **200** (version increments)
7. `07_publish_org_template_second` → **200** (version increments again)
8. `09_instantiate_workspace_template_correct_workspace` → **201** (project created)
9. `10_legacy_instantiate_route_gone` → **410**

## 📝 What to Paste for Review

After running the proof capture script, paste:

1. **Summary lines** printed by the script
2. **Full contents** of these response files:
   - `01_admin_create_org_template_no_workspace_header.response.txt`
   - `02_owner_create_workspace_template_with_header.response.txt`
   - `04_list_templates_no_workspace_header.response.txt`
   - `05_list_templates_with_workspace_header.response.txt`
   - `06_publish_org_template_first.response.txt`
   - `07_publish_org_template_second.response.txt`
   - `09_instantiate_workspace_template_correct_workspace.response.txt`
   - `10_legacy_instantiate_route_gone.response.txt`

## ✅ Build Status

- ✅ TypeScript build passes
- ✅ No linter errors
- ✅ All imports resolved
- ✅ Scripts are executable

## 🎯 Ready for Execution

All scripts are ready. Run the sequence above to capture the 8 API proofs.
