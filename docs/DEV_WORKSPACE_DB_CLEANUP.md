# Workspace Database Cleanup for Local Dev

**⚠️ WARNING: This is for local development only. Do NOT run in production.**

This script ensures the `workspaces` table has all expected columns including `permissions_config` and `default_methodology`.

## Steps

1. **Stop backend process**
   ```bash
   pkill -f "nest start" || pkill -f "npm run start:dev"
   ```

2. **Connect to database**
   ```bash
   cd zephix-backend
   psql $DATABASE_URL
   ```

3. **Drop and recreate table (local dev only)**
   ```sql
   DROP TABLE IF EXISTS workspaces CASCADE;
   \q
   ```

4. **Run migrations**
   ```bash
   npm run migration:run
   ```

5. **Restart backend**
   ```bash
   npm run start:dev
   ```

## Why This Is Safe

- Local dev data is demo seeded
- No production data is affected
- Migrations will recreate the table with correct schema

## Expected Result

After running migrations, the `workspaces` table should have:
- `permissions_config` (jsonb, nullable)
- `default_methodology` (varchar(50), nullable)
- All other standard workspace columns










