# Migration Consolidation Guide

## Overview

This guide documents the comprehensive migration consolidation process for the Zephix application. The goal is to consolidate all scattered migration files into a single directory with proper dependency ordering, specifically addressing the critical `roles` table creation issue.

## Problem Statement

### Current Issues
1. **Scattered Migration Files**: Migrations are spread across multiple directories:
   - `/src/database/migrations/` (main)
   - `/src/projects/database/migrations/`
   - `/src/pm/database/migrations/`
   - `/src/brd/database/migrations/`

2. **Roles Table Dependency Issue**: The `roles` table is created late in the dependency chain but is referenced by many other tables, causing foreign key constraint failures.

3. **Duplicate Migrations**: Multiple migrations create similar tables (e.g., BRD tables).

4. **Disabled Migrations**: Several migrations are disabled, creating confusion about the current state.

5. **TypeORM Configuration**: Configuration looks for migrations in multiple locations, leading to inconsistent behavior.

## Solution Architecture

### Consolidation Strategy
1. **Single Directory**: All migrations consolidated into `/src/database/migrations/`
2. **Proper Dependency Order**: Tables created in logical dependency sequence
3. **Early Roles Creation**: `roles` table created in Phase 1 (Foundation Tables)
4. **Cleanup**: Remove duplicate, disabled, and backup files
5. **Updated Configuration**: TypeORM configured to use single migration directory

### Dependency Phases

#### Phase 1: Foundation Tables (No Dependencies)
1. `organizations` - Base table for multi-tenancy
2. `users` - Base user table
3. `roles` - **CRITICAL**: Role definitions (referenced by many tables)
4. `user_organizations` - User-organization relationships

#### Phase 2: Core Business Tables
5. `projects` - Organization projects
6. `teams` - Project teams
7. `team_members` - Team membership with roles
8. `workflows` - Project workflows

#### Phase 3: Feature Tables
9. `brd_analysis` - Business requirements analysis
10. `status_reporting` - Project status reports
11. `email_verifications` - User email verification

#### Phase 4: Integration Tables
12. `jira_integrations` - JIRA integration settings
13. `github_integrations` - GitHub integration settings
14. `teams_integrations` - Microsoft Teams integration settings

## Implementation Process

### Prerequisites
- Node.js 20.x
- TypeScript
- ts-node
- Access to target database

### Step-by-Step Execution

#### 1. Backup Current State
```bash
# Run from zephix-backend directory
chmod +x scripts/backup-migration-state.sh
./scripts/backup-migration-state.sh
```

This creates a comprehensive backup with:
- All migration files
- Dependency analysis
- Migration execution order
- Current state documentation

#### 2. Execute Consolidation
```bash
# Run the main consolidation script
chmod +x scripts/execute-migration-consolidation.sh
./scripts/execute-migration-consolidation.sh
```

This script:
- Creates backup
- Runs consolidation logic
- Updates TypeORM configuration
- Creates verification scripts
- Updates package.json

#### 3. Verify Consolidation
```bash
# Verify the consolidated migration
npm run migration:verify:consolidated
```

#### 4. Execute Migration
```bash
# Run the consolidated migration
npm run migration:run:consolidated
```

## Generated Files

### Consolidated Migration
- **Location**: `src/database/migrations/{timestamp}-ConsolidatedDatabaseSchema.ts`
- **Purpose**: Single migration that creates all tables in proper order
- **Features**: 
  - Phased table creation
  - Proper dependency management
  - Comprehensive rollback support
  - Detailed logging

### Verification Script
- **Location**: `scripts/verify-consolidated-migration.ts`
- **Purpose**: Verify migration can be loaded and executed
- **Features**:
  - Database connection test
  - Migration loading verification
  - Consolidated migration detection

### Execution Script
- **Location**: `scripts/run-consolidated-migration.ts`
- **Purpose**: Execute the consolidated migration
- **Features**:
  - Migration execution
  - Table verification
  - Detailed logging
  - Error handling

## Updated Package.json Scripts

```json
{
  "scripts": {
    "migration:run:consolidated": "ts-node -r tsconfig-paths/register scripts/run-consolidated-migration.ts",
    "migration:verify:consolidated": "ts-node -r tsconfig-paths/register scripts/verify-consolidated-migration.ts"
  }
}
```

## TypeORM Configuration Changes

### Before (Scattered)
```typescript
// data-source.ts
migrations: [__dirname + '/**/migrations/*{.ts,.js}']

// app.module.ts
migrations: [__dirname + '/**/migrations/*{.ts,.js}']
```

### After (Consolidated)
```typescript
// data-source.ts
migrations: [__dirname + '/database/migrations/*{.ts,.js}']

// app.module.ts
migrations: [__dirname + '/database/migrations/*{.ts,.js}']
```

## Rollback Strategy

### Automatic Rollback
The consolidated migration includes a comprehensive `down()` method that:
1. Drops tables in reverse dependency order
2. Handles missing tables gracefully
3. Provides detailed logging

### Manual Rollback
If automatic rollback fails:
1. Restore from backup directory
2. Revert TypeORM configuration changes
3. Restore scattered migration directories

## Testing Strategy

### Development Testing
1. **Local Database**: Test on clean local PostgreSQL instance
2. **Migration Verification**: Run verification script
3. **Migration Execution**: Execute consolidated migration
4. **Table Verification**: Confirm all tables created correctly
5. **Application Testing**: Test application functionality

### Staging Testing
1. **Staging Database**: Test on staging environment
2. **Data Migration**: Migrate existing data if applicable
3. **Integration Testing**: Test with other services
4. **Performance Testing**: Verify migration performance

### Production Deployment
1. **Backup Production**: Create full database backup
2. **Staging Validation**: Ensure staging tests pass
3. **Rollback Plan**: Document rollback procedures
4. **Monitoring**: Monitor migration execution
5. **Verification**: Verify production tables

## Security Considerations

### Backup Security
- Backup directories contain sensitive database structure information
- Store backups securely
- Consider encryption for production backups

### Migration Security
- Consolidated migration contains table creation logic
- Review for sensitive information
- Ensure no hardcoded credentials

### Access Control
- Limit access to migration scripts
- Use appropriate database permissions
- Audit migration execution

## Monitoring and Observability

### Migration Logging
- Detailed console logging during execution
- Phase-by-phase progress tracking
- Error logging with context

### Database Verification
- Table count verification
- Schema validation
- Foreign key constraint checking

### Performance Metrics
- Migration execution time
- Table creation time per phase
- Rollback performance

## Troubleshooting

### Common Issues

#### 1. Migration Already Executed
**Symptoms**: "Migration already executed" error
**Solution**: Check migration table, remove if needed

#### 2. Foreign Key Constraint Failures
**Symptoms**: "Foreign key constraint violation" error
**Solution**: Ensure tables created in dependency order

#### 3. TypeORM Configuration Issues
**Symptoms**: "No migrations found" error
**Solution**: Verify migrations path in data-source.ts

#### 4. Database Connection Issues
**Symptoms**: "Connection refused" error
**Solution**: Check database URL and credentials

### Debug Commands
```bash
# Check migration state
npm run db:show

# Verify database connection
npm run db:verify

# Check table structure
npm run db:repair
```

## Best Practices

### Migration Management
1. **Single Source of Truth**: All migrations in one directory
2. **Dependency Ordering**: Create tables in logical sequence
3. **Rollback Support**: Always implement down() method
4. **Testing**: Test migrations before production

### Database Design
1. **Consistent Naming**: Use consistent table and column naming
2. **Indexing**: Create appropriate indexes for performance
3. **Constraints**: Implement proper foreign key constraints
4. **Data Types**: Use appropriate PostgreSQL data types

### Deployment
1. **Backup First**: Always backup before migration
2. **Test Staging**: Test on staging before production
3. **Rollback Plan**: Have rollback strategy ready
4. **Monitoring**: Monitor migration execution

## Future Considerations

### Migration Evolution
1. **Incremental Changes**: Add new migrations incrementally
2. **Version Control**: Track migration versions
3. **Dependency Management**: Maintain dependency documentation
4. **Automation**: Automate migration testing and deployment

### Database Maintenance
1. **Regular Backups**: Implement automated backup strategy
2. **Performance Monitoring**: Monitor table performance
3. **Index Optimization**: Optimize indexes based on usage
4. **Data Archiving**: Implement data archiving strategy

## Support and Maintenance

### Documentation Updates
- Update this guide when migration structure changes
- Document new dependencies and relationships
- Maintain troubleshooting section

### Team Training
- Train team on new migration process
- Document rollback procedures
- Establish migration review process

### Monitoring
- Monitor migration execution times
- Track migration failures
- Implement alerting for migration issues

## Conclusion

The migration consolidation process addresses the critical `roles` table dependency issue and provides a clean, maintainable migration structure. By consolidating all migrations into a single directory with proper dependency ordering, we ensure:

1. **Reliability**: Consistent migration execution
2. **Maintainability**: Single source of truth for database schema
3. **Performance**: Optimized table creation order
4. **Security**: Proper backup and rollback procedures
5. **Observability**: Comprehensive logging and monitoring

This solution follows enterprise best practices and provides a solid foundation for future database evolution.


