# Railway Deployment Fix - Migration Cleanup

## ✅ COMPLETED ACTIONS

### 1. Disabled Problematic Migrations
- ✅ Created `src/pm/database/migrations/disabled/` directory
- ✅ Moved broken PM table migrations:
  - `002_CreatePMTables.ts` → `disabled/`
  - `003_CreateStatusReportingTables.ts` → `disabled/`
  - `004_CreateRiskManagementTables.ts` → `disabled/`

### 2. Updated Migration Scripts
- ✅ Fixed `scripts/run-migrations.ts` to remove disabled migration imports
- ✅ Verified clean build without migration errors

### 3. Committed and Pushed Changes
- ✅ Git commit: "fix: Disable problematic PM migrations for clean Railway deployment"
- ✅ Pushed to main branch to trigger Railway deployment

## 🔄 NEXT STEPS FOR RAILWAY

### 1. Railway Database Reset (REQUIRED)
After code deployment completes:

1. **Go to Railway Dashboard**
   - Navigate to your PostgreSQL service
   - Click "Data" tab → "Reset Database"
   - Confirm the reset operation

2. **Why Reset is Needed**
   - Previous migration attempts may have corrupted database state
   - Fresh start ensures clean migration execution
   - Prevents conflicts with disabled migrations

### 2. Monitor Deployment
- Watch Railway deployment logs for success
- Verify database connection and health endpoint
- Check that BRD Project Planning endpoints are functional

## 🎯 EXPECTED OUTCOME

### ✅ Working Endpoints
- **Health Check**: `/api/health`
- **BRD Endpoints**: `/api/pm/brds/*`
- **BRD Project Planning**: `/api/brd/project-planning/*`

### ✅ Clean Migration State
- Only stable, working migrations remain active
- No SQL syntax errors or conflicts
- Successful database schema creation

## 🧪 VERIFICATION COMMANDS

After successful deployment, test production endpoints:

```bash
# Replace with actual Railway URL
curl https://your-app.railway.app/api/health
curl https://your-app.railway.app/api/pm/brds
curl https://your-app.railway.app/api/brd/project-planning/test-id/analyze
```

## 📁 CURRENT MIGRATION STATE

### ✅ Active Migrations (Clean)
```
src/database/migrations/
├── 005_CreateMultiTenancy.ts
├── 1704123600000-CreateWorkflowFramework.ts
└── 1735598000000-AddAIGenerationToIntakeForms.ts

src/brd/database/migrations/
├── 1704467100000-CreateBRDTable.ts
├── 007_AddChangesMadeToGeneratedProjectPlan.ts
└── 008_CreateBRDProjectPlanning.ts

src/pm/database/migrations/
├── 1703001000000-CreateBRDTable.ts
└── 1703002000000-CreateBRDAnalysisTables.ts
```

### 🚫 Disabled Migrations (Problematic)
```
src/pm/database/migrations/disabled/
├── 002_CreatePMTables.ts
├── 003_CreateStatusReportingTables.ts
└── 004_CreateRiskManagementTables.ts
```

## 🚨 ROLLBACK PLAN

If issues persist:

1. **Restore Disabled Migrations**
   ```bash
   mv src/pm/database/migrations/disabled/* src/pm/database/migrations/
   ```

2. **Revert Migration Script**
   ```bash
   git checkout HEAD~1 -- scripts/run-migrations.ts
   ```

3. **Investigate Migration Issues**
   - Check SQL syntax in disabled migrations
   - Verify PostgreSQL compatibility
   - Test migrations locally with clean database

## 📋 SUCCESS CRITERIA

- [ ] Railway deployment completes without errors
- [ ] Database reset successful
- [ ] Health endpoint responds correctly
- [ ] BRD Project Planning endpoints functional
- [ ] No migration conflicts in logs
- [ ] Frontend can connect to backend successfully

---

**Status**: ✅ Code changes complete, awaiting Railway deployment and database reset
**Next Action**: Monitor Railway deployment and reset database when ready
**Owner**: DevOps Team / Developer
**Priority**: High - Blocking production deployment
