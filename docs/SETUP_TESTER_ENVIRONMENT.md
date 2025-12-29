# Setting Up Clean Tester Environment

## Option A: Clean Organization for Testers (Recommended)

This creates a fresh organization with no demo workspaces.

### Step 1: Run Setup Script

```bash
cd zephix-backend
npm run setup:tester-org
# Or manually:
ts-node -r tsconfig-paths/register scripts/setup-tester-org.ts
```

### Step 2: Verify Setup

The script will:
- Create organization "Tester Organization" (or name from `TESTER_ORG_NAME` env var)
- Create three test accounts:
  - `tester-admin@zephix.ai` (admin role)
  - `tester-member@zephix.ai` (member role)
  - `tester-viewer@zephix.ai` (viewer role)
- Set default password: `Test123!@#` (or from `TESTER_PASSWORD` env var)
- Verify no workspaces exist in the org

### Step 3: Test Login

1. Log in as `tester-admin@zephix.ai`
2. **Expected**:
   - Zero workspaces visible
   - "Create workspace" button visible
   - Clean onboarding experience

## Option B: Clean Existing Org (Alternative)

If reusing an existing org:

### Step 1: Identify Tester Org

```sql
SELECT id, name FROM organizations WHERE name = 'Your Tester Org Name';
```

### Step 2: Delete Demo Workspaces

```sql
-- List workspaces in org
SELECT id, name, created_at FROM workspaces
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY created_at;

-- Soft delete demo workspaces (or hard delete if preferred)
UPDATE workspaces
SET deleted_at = NOW()
WHERE organization_id = 'YOUR_ORG_ID'
AND name LIKE '%demo%' OR name LIKE '%test%' OR name LIKE '%sample%';
```

### Step 3: Verify Clean State

```sql
-- Should return 0 or only workspaces created by testers
SELECT COUNT(*) FROM workspaces
WHERE organization_id = 'YOUR_ORG_ID'
AND deleted_at IS NULL;
```

## Environment Variables

Optional environment variables for setup script:

```bash
TESTER_ORG_NAME="Tester Organization"  # Default: "Tester Organization"
TESTER_PASSWORD="Test123!@#"            # Default: "Test123!@#"
DB_HOST=localhost                        # Database connection
DB_PORT=5432
DB_USERNAME=zephix_user
DB_PASSWORD=your_password
DB_DATABASE=zephix_development
```

## Verification Checklist

After setup, verify:

- [ ] Three test accounts exist and can log in
- [ ] All accounts are in the same organization
- [ ] Organization has zero workspaces (or only tester-created ones)
- [ ] Admin account sees "Create workspace" button
- [ ] Member and viewer accounts do NOT see "Create workspace" button
- [ ] New workspace shows empty state (no auto content)

## Troubleshooting

### Script fails with "relation does not exist"
- Ensure migrations have been run: `npm run migration:run`

### Users already exist
- Script will update existing users to be in tester org
- Check logs for "User updated" messages

### Workspaces still exist
- Script will warn if workspaces are found
- Manually delete or archive them before testing








