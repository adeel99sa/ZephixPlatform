# Running Migrations on Railway

Railway doesn't provide an interactive terminal in the UI for most setups. Use one of these methods to run database migrations.

## Option 1: Pre-Deploy Command (Recommended)

Set migrations to run automatically on every deploy.

### Setup

1. Railway Dashboard → `zephix-backend` → Settings
2. Find **"Pre-Deploy Command"** section
3. Add command:
   ```bash
   npm run migration:run
   ```
4. Save settings

### How It Works

- Railway runs the Pre-Deploy Command **after build** and **before deploy**
- If the migration fails, the entire deploy fails (prevents broken deployments)
- Migrations run automatically on every deployment
- No manual intervention needed

### Benefits

✅ **Safety:** Failed migrations block deployment  
✅ **Automation:** No manual steps required  
✅ **Consistency:** Migrations always run before new code deploys  
✅ **Visibility:** Migration output appears in deploy logs

### Example Deploy Log

```
[Build] npm ci
[Build] npm run build
[Pre-Deploy] npm run migration:run
[Pre-Deploy] Migration CreateProjectViewsAndWorkItemKeys1794000000000 has been executed successfully
[Deploy] Starting application...
```

## Option 2: Railway CLI (Manual)

Run migrations manually from your local machine using Railway CLI.

### Setup

1. **Get Railway Project Token:**
   - Railway Dashboard → Project Settings → Tokens
   - Create new token or use existing

2. **Run Migration:**
   ```bash
   RAILWAY_TOKEN=YOUR_TOKEN railway run --service zephix-backend npm run migration:run
   ```

   Or if already linked to the project:
   ```bash
   cd zephix-backend
   railway run npm run migration:run
   ```

### Benefits

✅ **Control:** Run migrations independently of deployments  
✅ **Testing:** Test migrations before deploying code  
✅ **Flexibility:** Run migrations on-demand  
✅ **Debugging:** See full migration output in real-time

### Use Cases

- Testing migrations before deploying
- Running migrations manually after a failed Pre-Deploy
- Running migrations on a different environment
- Debugging migration issues

## Option 3: One-Time Migration Script

For one-time migrations or emergency fixes, you can create a temporary script.

### Example

```bash
# Create temporary migration script
cat > run-migration.sh << 'EOF'
#!/bin/bash
npm run migration:run
EOF

# Run via Railway CLI
railway run --service zephix-backend bash run-migration.sh
```

## Verification

After running migrations, verify they executed:

```bash
railway run --service zephix-backend npm run migration:show
```

Expected output:
```
[X] 360 CreateProjectViewsAndWorkItemKeys1794000000000
[X] 364 AddAuthOutboxCompositeIndexes1796000000001
```

## Troubleshooting

### Migration Fails in Pre-Deploy

1. Check Railway deploy logs for error message
2. Fix migration issue locally
3. Test migration locally: `npm run migration:run`
4. Push fix and redeploy

### Migration Already Applied

If a migration was already applied manually, it will be skipped:
```
Migration CreateProjectViewsAndWorkItemKeys1794000000000 has already been executed
```

This is safe and expected.

### Database Connection Issues

If migrations fail with connection errors:
1. Verify `DATABASE_URL` is set correctly
2. Check database is accessible from Railway
3. Verify SSL settings match your database provider

## Best Practices

1. **Use Pre-Deploy Command** for production (automatic, safe)
2. **Test migrations locally** before pushing
3. **Run migrations manually** for testing/debugging
4. **Verify migrations** after deployment
5. **Keep migrations idempotent** (safe to run multiple times)

## Reference

- [Railway Docs - Integrations](https://docs.railway.app/deploy/integrations)
- [TypeORM Migrations](https://typeorm.io/migrations)
