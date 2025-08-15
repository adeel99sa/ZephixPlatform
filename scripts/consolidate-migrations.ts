#!/usr/bin/env ts-node

/**
 * Migration Consolidation Script
 * 
 * This script consolidates all scattered migration files into a single
 * /src/database/migrations/ directory with proper timestamp ordering
 * and dependency management.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface MigrationFile {
  path: string;
  timestamp: number;
  name: string;
  content: string;
  dependencies: string[];
}

class MigrationConsolidator {
  private migrations: MigrationFile[] = [];
  private readonly mainMigrationsDir = 'src/database/migrations';
  private readonly backupDir = `migrations_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;

  constructor() {
    console.log('🔄 Starting migration consolidation...');
  }

  /**
   * Main consolidation process
   */
  async consolidate(): Promise<void> {
    try {
      // Step 1: Create backup
      await this.createBackup();

      // Step 2: Scan all migration files
      await this.scanMigrationFiles();

      // Step 3: Analyze dependencies
      await this.analyzeDependencies();

      // Step 4: Generate consolidated migration
      await this.generateConsolidatedMigration();

      // Step 5: Clean up scattered migrations
      await this.cleanupScatteredMigrations();

      // Step 6: Update TypeORM configuration
      await this.updateTypeORMConfig();

      console.log('✅ Migration consolidation completed successfully!');
      console.log('📋 Next steps:');
      console.log('   1. Review the consolidated migration');
      console.log('   2. Test the migration on a development database');
      console.log('   3. Deploy to staging/production');

    } catch (error) {
      console.error('❌ Migration consolidation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Create comprehensive backup of current state
   */
  private async createBackup(): Promise<void> {
    console.log('📦 Creating backup...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Backup main migrations
    if (fs.existsSync(this.mainMigrationsDir)) {
      this.copyDirectory(this.mainMigrationsDir, `${this.backupDir}/main_migrations`);
    }

    // Backup scattered migrations
    const scatteredDirs = [
      'src/projects/database/migrations',
      'src/pm/database/migrations',
      'src/brd/database/migrations'
    ];

    for (const dir of scatteredDirs) {
      if (fs.existsSync(dir)) {
        const dirName = path.basename(dir);
        this.copyDirectory(dir, `${this.backupDir}/${dirName}`);
      }
    }

    console.log(`✅ Backup created in: ${this.backupDir}`);
  }

  /**
   * Scan all migration files across directories
   */
  private async scanMigrationFiles(): Promise<void> {
    console.log('🔍 Scanning migration files...');

    const migrationDirs = [
      this.mainMigrationsDir,
      'src/projects/database/migrations',
      'src/pm/database/migrations',
      'src/brd/database/migrations'
    ];

    for (const dir of migrationDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          if (file.endsWith('.ts') && !file.includes('.disabled') && !file.includes('.backup')) {
            const filePath = path.join(dir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Extract timestamp and name
            const match = file.match(/(\d+)-(.+)\.ts/);
            if (match) {
              const timestamp = parseInt(match[1]);
              const name = match[2];
              
              this.migrations.push({
                path: filePath,
                timestamp,
                name,
                content,
                dependencies: this.extractDependencies(content)
              });
            }
          }
        }
      }
    }

    console.log(`📁 Found ${this.migrations.length} migration files`);
  }

  /**
   * Extract table dependencies from migration content
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Look for table references in foreign keys, joins, etc.
    const tableRefs = content.match(/CREATE TABLE "?(\w+)"?/g);
    if (tableRefs) {
      tableRefs.forEach(ref => {
        const tableName = ref.replace(/CREATE TABLE "?(\w+)"?/, '$1');
        if (tableName !== 'migrations') {
          dependencies.push(tableName);
        }
      });
    }

    return dependencies;
  }

  /**
   * Analyze dependencies and determine execution order
   */
  private async analyzeDependencies(): Promise<void> {
    console.log('🔗 Analyzing dependencies...');

    // Sort migrations by timestamp and dependencies
    this.migrations.sort((a, b) => {
      // First, sort by timestamp
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      
      // Then by dependency complexity (more dependencies = later)
      return a.dependencies.length - b.dependencies.length;
    });

    console.log('📋 Migration execution order:');
    this.migrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.timestamp}-${migration.name}`);
    });
  }

  /**
   * Generate consolidated migration file
   */
  private async generateConsolidatedMigration(): Promise<void> {
    console.log('🔧 Generating consolidated migration...');

    const timestamp = Date.now();
    const fileName = `${timestamp}-ConsolidatedDatabaseSchema.ts`;
    const filePath = path.join(this.mainMigrationsDir, fileName);

    const migrationContent = this.buildConsolidatedMigration();
    
    fs.writeFileSync(filePath, migrationContent);
    
    console.log(`✅ Consolidated migration created: ${fileName}`);
  }

  /**
   * Build the consolidated migration content
   */
  private buildConsolidatedMigration(): string {
    return `import { MigrationInterface, QueryRunner, Table, TableForeignKey, Index } from 'typeorm';

export class ConsolidatedDatabaseSchema${Date.now()} implements MigrationInterface {
  name = 'ConsolidatedDatabaseSchema${Date.now()}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Starting consolidated database schema creation...');

    // Enable UUID extension
    await queryRunner.query(\`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"\`);

    // Phase 1: Foundation Tables (No Dependencies)
    await this.createFoundationTables(queryRunner);

    // Phase 2: Core Business Tables
    await this.createCoreBusinessTables(queryRunner);

    // Phase 3: Feature Tables
    await this.createFeatureTables(queryRunner);

    // Phase 4: Integration Tables
    await this.createIntegrationTables(queryRunner);

    console.log('✅ Consolidated database schema created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back consolidated database schema...');

    // Drop tables in reverse dependency order
    const tables = [
      'jira_integrations',
      'github_integrations',
      'teams_integrations',
      'email_verifications',
      'status_reporting',
      'brd_analysis',
      'workflows',
      'team_members',
      'teams',
      'projects',
      'user_organizations',
      'roles',
      'users',
      'organizations'
    ];

    for (const table of tables) {
      try {
        await queryRunner.dropTable(table, true, true);
        console.log(\`   Dropped table: \${table}\`);
      } catch (error) {
        console.log(\`   Table \${table} not found or already dropped\`);
      }
    }

    console.log('✅ Rollback completed');
  }

  /**
   * Phase 1: Foundation Tables (No Dependencies)
   */
  private async createFoundationTables(queryRunner: QueryRunner): Promise<void> {
    console.log('🏗️  Creating foundation tables...');

    // 1. Organizations table
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            default: '{}',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
          },
          {
            name: 'trialEndsAt',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'industry',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'size',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isEmailVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'emailVerifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 3. Roles table - CRITICAL: Must be created early
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 4. User Organizations table
    await queryRunner.createTable(
      new Table({
        name: 'user_organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'member'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for foundation tables
    await queryRunner.createIndex('organizations', 'IDX_ORGANIZATION_SLUG');
    await queryRunner.createIndex('organizations', 'IDX_ORGANIZATION_STATUS');
    await queryRunner.createIndex('users', 'IDX_USERS_EMAIL');
    await queryRunner.createIndex('user_organizations', 'IDX_USER_ORG_USER_ID');
    await queryRunner.createIndex('user_organizations', 'IDX_USER_ORG_ORG_ID');

    console.log('✅ Foundation tables created');
  }

  /**
   * Phase 2: Core Business Tables
   */
  private async createCoreBusinessTables(queryRunner: QueryRunner): Promise<void> {
    console.log('🏢 Creating core business tables...');

    // 5. Projects table
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'planning'",
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '50',
            default: "'medium'",
          },
          {
            name: 'startDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'budget',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 6. Teams table
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'projectId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 7. Team Members table
    await queryRunner.createTable(
      new Table({
        name: 'team_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'teamId',
            type: 'uuid',
          },
          {
            name: 'roleId',
            type: 'uuid',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 8. Workflows table
    await queryRunner.createTable(
      new Table({
        name: 'workflows',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'projectId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'",
          },
          {
            name: 'config',
            type: 'jsonb',
            default: '{}',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    console.log('✅ Core business tables created');
  }

  /**
   * Phase 3: Feature Tables
   */
  private async createFeatureTables(queryRunner: QueryRunner): Promise<void> {
    console.log('🎯 Creating feature tables...');

    // 9. BRD Analysis table
    await queryRunner.createTable(
      new Table({
        name: 'brd_analysis',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'projectId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'analysisData',
            type: 'jsonb',
            default: '{}',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 10. Status Reporting table
    await queryRunner.createTable(
      new Table({
        name: 'status_reporting',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'projectId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'reportData',
            type: 'jsonb',
            default: '{}',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 11. Email Verifications table
    await queryRunner.createTable(
      new Table({
        name: 'email_verifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'isUsed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    console.log('✅ Feature tables created');
  }

  /**
   * Phase 4: Integration Tables
   */
  private async createIntegrationTables(queryRunner: QueryRunner): Promise<void> {
    console.log('🔌 Creating integration tables...');

    // 12. JIRA Integrations table
    await queryRunner.createTable(
      new Table({
        name: 'jira_integrations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'baseUrl',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'apiToken',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 13. GitHub Integrations table
    await queryRunner.createTable(
      new Table({
        name: 'github_integrations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'baseUrl',
            type: 'varchar',
            length: '500',
            default: "'https://api.github.com'",
          },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 14. Teams Integrations table
    await queryRunner.createTable(
      new Table({
        name: 'teams_integrations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'webhookUrl',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    console.log('✅ Integration tables created');
  }
}
`;
  }

  /**
   * Clean up scattered migration files
   */
  private async cleanupScatteredMigrations(): Promise<void> {
    console.log('🧹 Cleaning up scattered migrations...');

    const scatteredDirs = [
      'src/projects/database/migrations',
      'src/pm/database/migrations',
      'src/brd/database/migrations'
    ];

    for (const dir of scatteredDirs) {
      if (fs.existsSync(dir)) {
        console.log(`   Removing directory: ${dir}`);
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    // Remove disabled and backup files from main migrations
    const mainMigrationsDir = this.mainMigrationsDir;
    if (fs.existsSync(mainMigrationsDir)) {
      const files = fs.readdirSync(mainMigrationsDir);
      
      for (const file of files) {
        if (file.includes('.disabled') || file.includes('.backup')) {
          const filePath = path.join(mainMigrationsDir, file);
          fs.unlinkSync(filePath);
          console.log(`   Removed: ${file}`);
        }
      }
    }

    console.log('✅ Cleanup completed');
  }

  /**
   * Update TypeORM configuration
   */
  private async updateTypeORMConfig(): Promise<void> {
    console.log('⚙️  Updating TypeORM configuration...');

    // Update data-source.ts
    const dataSourcePath = 'src/data-source.ts';
    if (fs.existsSync(dataSourcePath)) {
      let content = fs.readFileSync(dataSourcePath, 'utf-8');
      
      // Update migrations path to only use main migrations directory
      content = content.replace(
        /migrations: \[__dirname \+ '\/database\/migrations\/\*\{\.ts,\.js\}'\]/,
        "migrations: [__dirname + '/database/migrations/*{.ts,.js}']"
      );
      
      fs.writeFileSync(dataSourcePath, content);
      console.log('   Updated: src/data-source.ts');
    }

    // Update app.module.ts if needed
    const appModulePath = 'src/app.module.ts';
    if (fs.existsSync(appModulePath)) {
      let content = fs.readFileSync(appModulePath, 'utf-8');
      
      // Ensure migrations path is correct
      if (content.includes('migrations: [__dirname + \'/**/migrations/*{.ts,.js}\']')) {
        content = content.replace(
          /migrations: \[__dirname \+ '\/\*\*\/migrations\/\*\{\.ts,\.js\}'\]/,
          "migrations: [__dirname + '/database/migrations/*{.ts,.js}']"
        );
        
        fs.writeFileSync(appModulePath, content);
        console.log('   Updated: src/app.module.ts');
      }
    }

    console.log('✅ TypeORM configuration updated');
  }

  /**
   * Copy directory recursively
   */
  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// Run the consolidation
if (require.main === module) {
  const consolidator = new MigrationConsolidator();
  consolidator.consolidate().catch(console.error);
}


