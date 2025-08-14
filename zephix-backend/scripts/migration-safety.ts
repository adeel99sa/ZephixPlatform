#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment variables
config();

interface MigrationSafetyConfig {
  backupEnabled: boolean;
  validationEnabled: boolean;
  rollbackEnabled: boolean;
  maxMigrationTime: number; // seconds
  backupRetentionDays: number;
}

class MigrationSafetyManager {
  private dataSource: DataSource;
  private config: MigrationSafetyConfig;
  private backupDir: string;
  private startTime: number;

  constructor(config: MigrationSafetyConfig) {
    this.config = config;
    this.backupDir = path.join(process.cwd(), 'migration-backups');
    this.startTime = Date.now();
  }

  async initialize() {
    try {
      // Initialize database connection
      this.dataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: ['src/**/*.entity.ts'],
        migrations: ['src/database/migrations/*.ts'],
        synchronize: false,
        logging: true,
      });

      await this.dataSource.initialize();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }
  }

  async createBackup(): Promise<string | null> {
    if (!this.config.backupEnabled) {
      console.log('⚠️  Backup disabled, skipping...');
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Ensure backup directory exists
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // Create database backup using pg_dump
      const databaseUrl = new URL(process.env.DATABASE_URL!);
      const backupCommand = `PGPASSWORD="${databaseUrl.password}" pg_dump -h ${databaseUrl.hostname} -U ${databaseUrl.username} -d ${databaseUrl.pathname.slice(1)} -f ${backupPath}`;
      
      execSync(backupCommand, { stdio: 'pipe' });
      
      console.log(`✅ Database backup created: ${backupPath}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return backupPath;
    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      return null;
    }
  }

  async validateMigrationState(): Promise<boolean> {
    if (!this.config.validationEnabled) {
      console.log('⚠️  Validation disabled, skipping...');
      return true;
    }

    try {
      // Check if there are pending migrations
      const pendingMigrations = await this.dataSource.showMigrations();
      
      if (pendingMigrations) {
        console.log('✅ No pending migrations found');
        return true;
      }

      // Check migration table integrity
      const migrationTableExists = await this.dataSource.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'migrations')"
      );

      if (!migrationTableExists[0].exists) {
        console.log('⚠️  Migrations table does not exist, will be created');
        return true;
      }

      // Validate migration records
      const migrations = await this.dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp'
      );

      console.log(`✅ Found ${migrations.length} executed migrations`);
      
      // Check for gaps in migration sequence
      for (let i = 1; i < migrations.length; i++) {
        const current = migrations[i];
        const previous = migrations[i - 1];
        
        if (current.timestamp <= previous.timestamp) {
          console.error(`❌ Migration sequence error: ${current.name} timestamp <= ${previous.name}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Migration validation failed:', error.message);
      return false;
    }
  }

  async runMigrations(): Promise<boolean> {
    try {
      console.log('🚀 Starting migration execution...');
      
      const migrations = await this.dataSource.runMigrations();
      
      if (migrations.length === 0) {
        console.log('✅ No new migrations to run');
        return true;
      }

      console.log(`✅ Successfully ran ${migrations.length} migrations:`);
      migrations.forEach(migration => {
        console.log(`  - ${migration.name}`);
      });

      return true;
    } catch (error) {
      console.error('❌ Migration execution failed:', error.message);
      return false;
    }
  }

  async rollback(backupPath: string): Promise<boolean> {
    if (!this.config.rollbackEnabled || !backupPath) {
      console.log('⚠️  Rollback disabled or no backup available');
      return false;
    }

    try {
      console.log('🔄 Starting rollback process...');
      
      // Restore from backup
      const databaseUrl = new URL(process.env.DATABASE_URL!);
      const restoreCommand = `PGPASSWORD="${databaseUrl.password}" psql -h ${databaseUrl.hostname} -U ${databaseUrl.username} -d ${databaseUrl.pathname.slice(1)} -f ${backupPath}`;
      
      execSync(restoreCommand, { stdio: 'pipe' });
      
      console.log('✅ Rollback completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      const retentionMs = this.config.backupRetentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleaned up old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('⚠️  Backup cleanup failed:', error.message);
    }
  }

  async checkMigrationTime(): Promise<boolean> {
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    if (elapsed > this.config.maxMigrationTime) {
      console.error(`❌ Migration exceeded maximum time limit: ${elapsed}s > ${this.config.maxMigrationTime}s`);
      return false;
    }
    
    return true;
  }

  async close() {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

async function main() {
  const config: MigrationSafetyConfig = {
    backupEnabled: process.env.MIGRATION_BACKUP_ENABLED !== 'false',
    validationEnabled: process.env.MIGRATION_VALIDATION_ENABLED !== 'false',
    rollbackEnabled: process.env.MIGRATION_ROLLBACK_ENABLED !== 'false',
    maxMigrationTime: parseInt(process.env.MIGRATION_MAX_TIME || '300'),
    backupRetentionDays: parseInt(process.env.MIGRATION_BACKUP_RETENTION_DAYS || '7'),
  };

  const manager = new MigrationSafetyManager(config);
  let backupPath: string | null = null;
  let success = false;

  try {
    console.log('🔒 Starting Migration Safety Manager...');
    console.log('Configuration:', JSON.stringify(config, null, 2));

    // Initialize connection
    await manager.initialize();

    // Create backup
    backupPath = await manager.createBackup();

    // Validate migration state
    const isValid = await manager.validateMigrationState();
    if (!isValid) {
      throw new Error('Migration validation failed');
    }

    // Run migrations
    success = await manager.runMigrations();

    // Check execution time
    const timeCheck = await manager.checkMigrationTime();
    if (!timeCheck) {
      throw new Error('Migration exceeded time limit');
    }

    if (success) {
      console.log('🎉 Migration completed successfully!');
    } else {
      throw new Error('Migration execution failed');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    
    // Attempt rollback if enabled
    if (config.rollbackEnabled && backupPath) {
      console.log('🔄 Attempting rollback...');
      const rollbackSuccess = await manager.rollback(backupPath);
      
      if (rollbackSuccess) {
        console.log('✅ Rollback completed successfully');
      } else {
        console.error('❌ Rollback failed - manual intervention required');
        process.exit(1);
      }
    }
    
    process.exit(1);
  } finally {
    await manager.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MigrationSafetyManager, MigrationSafetyConfig };
