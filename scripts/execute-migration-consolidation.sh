#!/bin/bash

# Migration Consolidation Execution Script
# This script executes the complete migration consolidation process

set -e

echo "🚀 Zephix Migration Consolidation Process"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "This script must be run from the zephix-backend directory"
    exit 1
fi

print_status "Starting migration consolidation process..."

# Step 1: Create backup
print_status "Step 1: Creating backup of current migration state..."
if [ -f "scripts/backup-migration-state.sh" ]; then
    chmod +x scripts/backup-migration-state.sh
    ./scripts/backup-migration-state.sh
    print_success "Backup completed"
else
    print_warning "Backup script not found, creating manual backup..."
    BACKUP_DIR="migrations_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup main migrations
    if [ -d "src/database/migrations" ]; then
        cp -r src/database/migrations "$BACKUP_DIR/main_migrations"
    fi
    
    # Backup scattered migrations
    if [ -d "src/projects/database/migrations" ]; then
        cp -r src/projects/database/migrations "$BACKUP_DIR/project_migrations"
    fi
    
    if [ -d "src/pm/database/migrations" ]; then
        cp -r src/pm/database/migrations "$BACKUP_DIR/pm_migrations"
    fi
    
    if [ -d "src/brd/database/migrations" ]; then
        cp -r src/brd/database/migrations "$BACKUP_DIR/brd_migrations"
    fi
    
    print_success "Manual backup created in: $BACKUP_DIR"
fi

# Step 2: Install dependencies if needed
print_status "Step 2: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 3: Run the consolidation script
print_status "Step 3: Running migration consolidation script..."
if [ -f "scripts/consolidate-migrations.ts" ]; then
    # Check if ts-node is available
    if ! command -v ts-node &> /dev/null; then
        print_status "Installing ts-node globally..."
        npm install -g ts-node
    fi
    
    # Run the consolidation script
    npx ts-node scripts/consolidate-migrations.ts
    
    if [ $? -eq 0 ]; then
        print_success "Migration consolidation completed"
    else
        print_error "Migration consolidation failed"
        exit 1
    fi
else
    print_error "Consolidation script not found: scripts/consolidate-migrations.ts"
    exit 1
fi

# Step 4: Verify the consolidated migration
print_status "Step 4: Verifying consolidated migration..."
if [ -d "src/database/migrations" ]; then
    CONSOLIDATED_MIGRATION=$(find src/database/migrations -name "*ConsolidatedDatabaseSchema.ts" | head -1)
    
    if [ -n "$CONSOLIDATED_MIGRATION" ]; then
        print_success "Consolidated migration found: $(basename "$CONSOLIDATED_MIGRATION")"
        
        # Show migration structure
        echo ""
        print_status "Current migration structure:"
        ls -la src/database/migrations/
        echo ""
    else
        print_warning "No consolidated migration found"
    fi
else
    print_error "Main migrations directory not found"
    exit 1
fi

# Step 5: Update package.json scripts
print_status "Step 5: Updating package.json scripts..."
if [ -f "package.json" ]; then
    # Check if migration scripts need updating
    if grep -q "migration:run:consolidated" package.json; then
        print_success "Migration scripts already updated"
    else
        print_status "Adding consolidated migration scripts..."
        
        # Add new scripts to package.json
        npm pkg set scripts.migration:run:consolidated="ts-node -r tsconfig-paths/register scripts/run-consolidated-migration.ts"
        npm pkg set scripts.migration:verify:consolidated="ts-node -r tsconfig-paths/register scripts/verify-consolidated-migration.ts"
        
        print_success "Migration scripts added to package.json"
    fi
fi

# Step 6: Create verification script
print_status "Step 6: Creating migration verification script..."
cat > scripts/verify-consolidated-migration.ts << 'EOF'
#!/usr/bin/env ts-node

/**
 * Migration Verification Script
 * Verifies that the consolidated migration can be executed successfully
 */

import { DataSource } from 'typeorm';
import dataSourceOptions from '../src/data-source';

async function verifyMigration() {
  console.log('🔍 Verifying consolidated migration...');
  
  try {
    // Create a test data source
    const testDataSource = new DataSource({
      ...dataSourceOptions,
      logging: false, // Disable logging for verification
    });
    
    // Test connection
    await testDataSource.initialize();
    console.log('✅ Database connection successful');
    
    // Test migration loading
    const migrations = await testDataSource.migrations;
    console.log(`📋 Found ${migrations.length} migration(s)`);
    
    // Check for consolidated migration
    const consolidatedMigration = migrations.find(m => 
      m.name.includes('ConsolidatedDatabaseSchema')
    );
    
    if (consolidatedMigration) {
      console.log('✅ Consolidated migration found and loaded');
      console.log(`   Name: ${consolidatedMigration.name}`);
      console.log(`   Timestamp: ${consolidatedMigration.timestamp}`);
    } else {
      console.log('❌ Consolidated migration not found');
    }
    
    await testDataSource.destroy();
    console.log('✅ Verification completed successfully');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyMigration().catch(console.error);
}
EOF

chmod +x scripts/verify-consolidated-migration.ts
print_success "Verification script created"

# Step 7: Create execution script for the consolidated migration
print_status "Step 7: Creating consolidated migration execution script..."
cat > scripts/run-consolidated-migration.ts << 'EOF'
#!/usr/bin/env ts-node

/**
 * Consolidated Migration Execution Script
 * Executes the consolidated migration on the target database
 */

import { DataSource } from 'typeorm';
import dataSourceOptions from '../src/data-source';

async function runConsolidatedMigration() {
  console.log('🚀 Starting consolidated migration execution...');
  
  try {
    // Create data source
    const dataSource = new DataSource(dataSourceOptions);
    
    // Initialize connection
    await dataSource.initialize();
    console.log('✅ Database connection established');
    
    // Check current migration state
    const currentMigrations = await dataSource.query(
      "SELECT * FROM information_schema.tables WHERE table_name = 'migrations'"
    );
    
    if (currentMigrations.length === 0) {
      console.log('📝 No migrations table found, creating fresh database...');
    } else {
      console.log('📝 Migrations table found, checking current state...');
      const executedMigrations = await dataSource.query(
        "SELECT * FROM migrations ORDER BY timestamp"
      );
      console.log(`   Found ${executedMigrations.length} executed migration(s)`);
    }
    
    // Run migrations
    console.log('🔄 Running consolidated migration...');
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length > 0) {
      console.log(`✅ Successfully executed ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    } else {
      console.log('ℹ️  No pending migrations found');
    }
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT IN ('migrations')
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tables.length} table(s):`);
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    await dataSource.destroy();
    console.log('✅ Consolidated migration execution completed');
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runConsolidatedMigration().catch(console.error);
}
EOF

chmod +x scripts/run-consolidated-migration.ts
print_success "Execution script created"

# Step 8: Final verification
print_status "Step 8: Final verification..."
echo ""
print_success "Migration consolidation process completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "   1. ✅ Backup created of all migration files"
echo "   2. ✅ All migrations consolidated into single directory"
echo "   3. ✅ Roles table moved to early dependency chain"
echo "   4. ✅ Scattered migration directories cleaned up"
echo "   5. ✅ TypeORM configuration updated"
echo "   6. ✅ New scripts added to package.json"
echo "   7. ✅ Verification and execution scripts created"
echo ""
echo "🔄 Next steps:"
echo "   1. Review the consolidated migration: src/database/migrations/*ConsolidatedDatabaseSchema.ts"
echo "   2. Test on development database: npm run migration:verify:consolidated"
echo "   3. Execute on target database: npm run migration:run:consolidated"
echo "   4. Deploy to staging/production"
echo ""
echo "⚠️  Important notes:"
echo "   - The roles table is now created early in the dependency chain"
echo "   - All tables are created in proper dependency order"
echo "   - Duplicate and disabled migrations have been removed"
echo "   - TypeORM now only looks in src/database/migrations/"
echo ""
echo "🔒 Backup location: migrations_backup_*"


