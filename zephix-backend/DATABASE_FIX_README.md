# 🚨 Database Migration Fix Guide

## **IMMEDIATE FIX - Clean Slate Approach**

This guide will fix your database migration issues with a clean slate approach. **WARNING: This will destroy all existing data.**

### **Step 1: Stop Auto-Migrations**
✅ **COMPLETED** - Auto-migrations have been disabled in the application startup

### **Step 2: Reset Database (Clean Slate)**
```bash
# Option A: Use the automated reset script
npm run db:reset

# Option B: Manual reset (if script fails)
psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE'
psql "$DATABASE_URL" -c 'CREATE SCHEMA public'
psql "$DATABASE_URL" -c 'GRANT ALL ON SCHEMA public TO postgres'
psql "$DATABASE_URL" -c 'GRANT ALL ON SCHEMA public TO public'
psql "$DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto"'
psql "$DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'
psql "$DATABASE_URL" -c 'DROP TABLE IF EXISTS "migrations"'
```

### **Step 3: Repair Database Schema**
```bash
# Run the automated repair tool
npm run db:repair
```

### **Step 4: Run Migrations**
```bash
# Build the application first
npm run build

# Run migrations
npm run db:migrate

# Verify migrations
npm run db:show
```

### **Step 5: Verify Database Health**
```bash
# Check database integrity
npm run db:verify

# Run safety check
npm run db:safety-check

# Test health endpoint
npm run health:check
```

## **Alternative Fix - Data Preservation Approach**

If you need to keep existing data, use this approach instead:

### **Step 1: Disable Auto-Migrations**
✅ **COMPLETED** - Auto-migrations disabled

### **Step 2: Identify Missing Tables**
```bash
npm run db:verify
```

### **Step 3: Repair Specific Issues**
```bash
npm run db:repair
```

### **Step 4: Run Migrations**
```bash
npm run db:migrate
```

## **New Database Management Commands**

### **Available Scripts**
- `npm run db:reset` - Complete database reset (destroys all data)
- `npm run db:repair` - Repair database schema issues
- `npm run db:verify` - Verify database integrity
- `npm run db:safety-check` - Check migration prerequisites
- `npm run db:show` - Show migration status
- `npm run db:migrate` - Run pending migrations

### **Health Monitoring**
- `npm run health:check` - Test application health
- Health endpoint: `/api/health` - Comprehensive health check
- Readiness endpoint: `/api/health/ready` - Kubernetes readiness probe
- Liveness endpoint: `/api/health/live` - Kubernetes liveness probe

## **Prevention Measures**

### **Migration Safety Features**
✅ **COMPLETED** - The following safety measures are now in place:

1. **Auto-migrations disabled** - No more automatic migration execution on boot
2. **Transaction safety** - Each migration runs in its own transaction
3. **Prerequisite checking** - Health checks verify required tables exist
4. **Foreign key validation** - Automated FK constraint verification
5. **Startup health checks** - Application won't serve traffic if critical tables missing

### **Best Practices Enforced**
- Never run `synchronize: true` in production
- Always use explicit migrations
- Check table dependencies before running migrations
- Validate foreign key relationships
- Monitor database health continuously

## **Troubleshooting**

### **Common Issues & Solutions**

#### **Issue: "Table 'projects' doesn't exist"**
```bash
# Solution: Run repair tool
npm run db:repair
```

#### **Issue: "Foreign key constraint violation"**
```bash
# Solution: Check and repair constraints
npm run db:repair
npm run db:verify
```

#### **Issue: "Migration already executed"**
```bash
# Solution: Check migration status
npm run db:show

# If needed, reset migrations table
psql "$DATABASE_URL" -c 'DELETE FROM migrations WHERE name LIKE "CreateProjects%"'
```

### **Emergency Recovery**
If everything fails, use the nuclear option:
```bash
npm run db:reset
npm run db:repair
npm run db:migrate
```

## **Production Deployment**

### **Railway Deployment**
1. **Never** enable auto-migrations in production
2. Run migrations manually before deployment
3. Use health checks to verify deployment success
4. Monitor database connectivity continuously

### **Migration Workflow**
```bash
# 1. Generate migration
npm run db:migrate:generate

# 2. Review migration file
# 3. Test locally
npm run db:migrate:dev

# 4. Deploy to staging
# 5. Run migration on staging
npm run db:migrate

# 6. Deploy to production
# 7. Run migration on production
npm run db:migrate
```

## **Monitoring & Alerts**

### **Health Check Alerts**
The application now monitors:
- Database connectivity
- Required table existence
- Foreign key integrity
- Migration state

### **Logging**
- All database operations are logged
- Migration execution is tracked
- Health check failures are logged with details

## **Next Steps**

1. **Immediate**: Run the clean slate fix
2. **Short-term**: Implement proper migration workflow
3. **Long-term**: Add database backup and recovery procedures

---

**⚠️ IMPORTANT**: Always backup your database before running destructive operations in production!
