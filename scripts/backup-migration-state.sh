#!/bin/bash

# Migration State Backup Script
# This script creates a comprehensive backup of all migration files before consolidation

set -e

echo "🔄 Starting migration state backup..."

# Create backup directory with timestamp
BACKUP_DIR="migrations_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Creating backup directory: $BACKUP_DIR"

# Backup main migrations directory
if [ -d "src/database/migrations" ]; then
    echo "📦 Backing up main migrations..."
    cp -r src/database/migrations "$BACKUP_DIR/main_migrations"
fi

# Backup project migrations
if [ -d "src/projects/database/migrations" ]; then
    echo "📦 Backing up project migrations..."
    cp -r src/projects/database/migrations "$BACKUP_DIR/project_migrations"
fi

# Backup PM migrations
if [ -d "src/pm/database/migrations" ]; then
    echo "📦 Backing up PM migrations..."
    cp -r src/pm/database/migrations "$BACKUP_DIR/pm_migrations"
fi

# Backup BRD migrations
if [ -d "src/brd/database/migrations" ]; then
    echo "📦 Backing up BRD migrations..."
    cp -r src/brd/database/migrations "$BACKUP_DIR/brd_migrations"
fi

# Create migration dependency analysis
echo "🔍 Analyzing migration dependencies..."
cat > "$BACKUP_DIR/migration_analysis.md" << 'EOF'
# Migration Dependency Analysis

## Current Migration Structure

### Main Migrations (/src/database/migrations/)
- 1700000000000-ResetMigrationState.ts
- 1700000000001-CreateMultiTenancy.ts
- 1700000000002-CreateAuthTables.ts
- 1704123600000-CreateWorkflowFramework.ts
- 1710000000000-CreateDashboardSystem.ts
- 1735598000000-AddAIGenerationToIntakeForms.ts
- 1755044971817-StatusReporting.ts
- 1755044974000-FixStatusReportingRelationships.ts.disabled
- 1755044975000-FixAllEntityRelationships.ts.disabled
- 1755044976000-AddEmailVerificationColumns.ts
- 1755044976001-FixMigrationConflict.ts.disabled
- 1755044976002-ResetMigrationState.ts.disabled
- 1755044977000-CreateEmailVerificationsTable.ts

### Project Migrations (/src/projects/database/migrations/)
- 1755044980000-CreateProjectsTables.ts

### PM Migrations (/src/pm/database/migrations/)
- 1700000000004-CreateBRDTable.ts
- 1700000000005-CreateBRDAnalysisTables.ts

### BRD Migrations (/src/brd/database/migrations/)
- 1704467100000-CreateBRDTable.ts
- 1755044978000-AddChangesMadeToGeneratedProjectPlan.ts
- 1755044979000-CreateBRDProjectPlanning.ts

## Dependency Analysis

### Critical Dependencies (Must be created first)
1. **organizations** - Base table for multi-tenancy
2. **users** - Base user table
3. **roles** - Role definitions (referenced by many tables)
4. **user_organizations** - User-organization relationships

### Table Dependencies
- projects → organizations, roles
- teams → organizations, projects
- team_members → users, teams, roles
- workflows → organizations, projects
- brd_analysis → organizations, projects
- status_reporting → organizations, projects

## Issues Identified
1. **roles table creation** - Currently in CreateProjectsTables but needed earlier
2. **Duplicate BRD table creation** - Multiple migrations create similar tables
3. **Disabled migrations** - Several migrations are disabled, creating confusion
4. **Scattered migration files** - Migrations spread across multiple directories

## Consolidation Plan
1. Create single consolidated migration with proper dependency order
2. Move all migrations to /src/database/migrations/
3. Ensure roles table is created early in dependency chain
4. Remove duplicate and disabled migrations
5. Update TypeORM configuration
EOF

# Create migration execution order
cat > "$BACKUP_DIR/migration_order.md" << 'EOF'
# Recommended Migration Execution Order

## Phase 1: Foundation Tables
1. organizations
2. users
3. roles
4. user_organizations

## Phase 2: Core Business Tables
5. projects
6. teams
7. team_members
8. workflows

## Phase 3: Feature Tables
9. brd_analysis
10. status_reporting
11. email_verifications

## Phase 4: Integration Tables
12. jira_integrations
13. github_integrations
14. teams_integrations
EOF

echo "✅ Migration state backup completed in: $BACKUP_DIR"
echo "📋 Analysis files created:"
echo "   - migration_analysis.md"
echo "   - migration_order.md"
echo ""
echo "🔄 Next step: Run consolidation script"


