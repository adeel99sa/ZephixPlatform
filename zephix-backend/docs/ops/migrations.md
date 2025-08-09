# Database Migrations

This document describes the safe database migration system for Zephix Backend.

## Overview

Database migrations are **disabled by default** during application startup to prevent deployment loops and ensure safe, controlled database schema changes.

## Configuration

### Environment Variable

- **`RUN_MIGRATIONS_ON_BOOT`** (default: `false`)
  - When `true`: Migrations run automatically during application startup
  - When `false`: Migrations are skipped during startup (recommended for production)

### Setting the Environment Variable

```bash
# To enable migrations on boot (not recommended for production)
export RUN_MIGRATIONS_ON_BOOT=true

# To disable migrations on boot (default, recommended)
export RUN_MIGRATIONS_ON_BOOT=false
```

## Running Migrations

### Manual Migration (Recommended)

Use the dedicated migration script to run migrations safely:

```bash
cd zephix-backend
npm run db:migrate
```

This script:
- Connects to the database using current environment configuration
- Runs all pending migrations in order
- Shows detailed output of which migrations were executed
- Exits cleanly when complete

### Automatic Migration (Development Only)

Set `RUN_MIGRATIONS_ON_BOOT=true` to run migrations during application startup:

```bash
export RUN_MIGRATIONS_ON_BOOT=true
npm run start:dev
```

**⚠️ Warning**: Not recommended for production environments.

## Production Deployment Workflow

### Initial Setup

1. Deploy application with `RUN_MIGRATIONS_ON_BOOT=false`
2. Verify application starts successfully
3. Run migrations manually using Railway shell
4. Verify application functionality

### Ongoing Updates

1. Deploy application updates with `RUN_MIGRATIONS_ON_BOOT=false`
2. If new migrations are included:
   - Use Railway shell to run `npm run db:migrate`
   - Monitor migration execution
   - Verify application continues to work

## Railway Production Steps

### First-time Migration

1. **Deploy Application**:
   ```bash
   # Ensure RUN_MIGRATIONS_ON_BOOT=false in Railway environment
   ```

2. **Open Railway Shell**:
   ```bash
   railway shell
   ```

3. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Verify Success**:
   ```bash
   curl -i https://your-app.railway.app/api/health
   ```

### Subsequent Deployments

1. **Deploy with Migration Control**:
   - Keep `RUN_MIGRATIONS_ON_BOOT=false`
   - Application will start without running migrations

2. **Run New Migrations** (if any):
   ```bash
   railway shell
   npm run db:migrate
   ```

## Migration Files

Migrations are located in:
- `src/projects/database/migrations/` - Project-related tables
- `src/pm/database/migrations/` - Project Management tables

Current migrations:
1. `001_CreateProjectsTables.ts` - Core project tables
2. `002_CreatePMTables.ts` - Project management base tables  
3. `003_CreateStatusReportingTables.ts` - Status reporting tables
4. `004_CreateRiskManagementTables.ts` - Risk management tables

## Troubleshooting

### Migration Fails

1. **Check Database Connection**:
   ```bash
   # Verify DATABASE_URL is correct
   echo $DATABASE_URL
   ```

2. **Check Migration Status**:
   ```bash
   # Run with verbose logging
   DEBUG=* npm run db:migrate
   ```

3. **Manual Recovery**:
   - Review the exact migration that failed
   - Fix any data issues manually if needed
   - Re-run migrations

### Application Won't Start

1. **Verify Environment**:
   ```bash
   # Ensure this is set to false in production
   echo $RUN_MIGRATIONS_ON_BOOT
   ```

2. **Check Dependencies**:
   ```bash
   npm ci
   npm run build
   ```

### Railway Shell Issues

1. **Access Shell**:
   ```bash
   railway login
   railway shell --service zephix-backend
   ```

2. **Check Environment in Shell**:
   ```bash
   env | grep -E "(DATABASE_URL|RUN_MIGRATIONS)"
   ```

## Security Notes

- Never log or expose `DATABASE_URL` or other secrets
- Use Railway shell for production migrations to avoid exposing credentials
- Always test migrations in staging environment first
- Keep `RUN_MIGRATIONS_ON_BOOT=false` in production

## Best Practices

1. **Always backup database** before running migrations in production
2. **Test migrations** in staging environment first
3. **Run migrations during maintenance windows** when possible
4. **Monitor application health** after migrations
5. **Keep migration rollback plans** ready
6. **Use Railway shell** for production migration execution

## Migration Script Details

The `npm run db:migrate` script:
- Uses TypeScript with ts-node for execution
- Loads all entities and migrations automatically
- Provides detailed logging of migration execution
- Handles database connections safely
- Exits cleanly on completion or error

This ensures safe, controlled database schema updates without risking application deployment loops.
