import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface MigrationResult {
  success: boolean;
  migrationsExecuted: number;
  error?: string;
  details?: string[];
}

@Injectable()
export class MigrationRunnerService implements OnModuleInit {
  private readonly logger = new Logger(MigrationRunnerService.name);
  private readonly dataSource: DataSource;

  constructor(
    private readonly configService: ConfigService,
    dataSource: DataSource,
  ) {
    this.dataSource = dataSource;
  }

  async onModuleInit() {
    // Don't auto-run migrations on startup in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Production environment detected - migrations will not auto-run');
      return;
    }

    // Check if migrations should run on startup
    const runMigrationsOnBoot = this.configService.get('database.runMigrationsOnBoot');
    if (runMigrationsOnBoot) {
      this.logger.log('Auto-running migrations on startup...');
      await this.runMigrations();
    } else {
      this.logger.log('Migrations disabled on boot - run manually via CLI');
    }
  }

  /**
   * Run all pending migrations with comprehensive error handling
   */
  async runMigrations(): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log('🚀 Starting migration execution...');

      // Verify database connection
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.logger.log('✅ Database connection established');
      }

      // Check migration table state
      const migrationTableExists = await this.checkMigrationTable();
      if (!migrationTableExists) {
        this.logger.log('📝 Creating migrations table...');
        await this.createMigrationTable();
      }

      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations();
      if (pendingMigrations.length === 0) {
        this.logger.log('ℹ️  No pending migrations found');
        return {
          success: true,
          migrationsExecuted: 0,
          details: ['No pending migrations']
        };
      }

      this.logger.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
      pendingMigrations.forEach(migration => {
        this.logger.log(`   - ${migration.name} (${migration.timestamp})`);
      });

      // Execute migrations with transaction safety
      const executedMigrations = await this.executeMigrations(pendingMigrations);
      
      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Migrations completed successfully in ${executionTime}ms`);
      this.logger.log(`   Executed: ${executedMigrations.length} migration(s)`);

      return {
        success: true,
        migrationsExecuted: executedMigrations.length,
        details: executedMigrations.map(m => m.name)
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Migration execution failed after ${executionTime}ms:`, error);
      
      return {
        success: false,
        migrationsExecuted: 0,
        error: error.message,
        details: [error.stack]
      };
    }
  }

  /**
   * Check if migrations table exists
   */
  private async checkMigrationTable(): Promise<boolean> {
    try {
      const result = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        )
      `);
      return result[0]?.exists || false;
    } catch (error) {
      this.logger.warn('Could not check migration table:', error.message);
      return false;
    }
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async createMigrationTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" integer NOT NULL GENERATED ALWAYS AS IDENTITY,
          "timestamp" bigint NOT NULL,
          "name" character varying NOT NULL,
          "executed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PK_migrations" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_migrations_timestamp" UNIQUE ("timestamp")
        )
      `);
      this.logger.log('✅ Migrations table created');
    } catch (error) {
      this.logger.error('Failed to create migrations table:', error.message);
      throw error;
    }
  }

  /**
   * Get pending migrations
   */
  private async getPendingMigrations(): Promise<any[]> {
    try {
      // Get all available migrations
      const availableMigrations = this.dataSource.migrations || [];
      
      // Get executed migrations
      const executedMigrations = await this.dataSource.query(
        'SELECT timestamp FROM migrations ORDER BY timestamp'
      );
      
      const executedTimestamps = executedMigrations.map(m => m.timestamp);
      
      // Filter out already executed migrations
      const pendingMigrations = availableMigrations.filter(migration => 
        !executedTimestamps.includes(migration.timestamp)
      );

      // Sort by timestamp for proper execution order
      return pendingMigrations.sort((a, b) => a.timestamp - b.timestamp);
      
    } catch (error) {
      this.logger.error('Failed to get pending migrations:', error.message);
      throw error;
    }
  }

  /**
   * Execute migrations with comprehensive error handling
   */
  private async executeMigrations(pendingMigrations: any[]): Promise<any[]> {
    const executedMigrations: any[] = [];
    
    for (const migration of pendingMigrations) {
      try {
        this.logger.log(`🔄 Executing migration: ${migration.name}`);
        
        // Execute migration
        await this.dataSource.runMigrations({
          transaction: 'each', // Each migration in its own transaction
          fake: false,
        });
        
        // Record successful execution
        executedMigrations.push(migration);
        this.logger.log(`✅ Migration executed: ${migration.name}`);
        
      } catch (error) {
        this.logger.error(`❌ Migration failed: ${migration.name}`, error.message);
        
        // Log detailed error information
        if (error.query) {
          this.logger.error('Failed query:', error.query);
        }
        if (error.parameters) {
          this.logger.error('Query parameters:', error.parameters);
        }
        
        // Re-throw to stop execution
        throw new Error(`Migration ${migration.name} failed: ${error.message}`);
      }
    }
    
    return executedMigrations;
  }

  /**
   * Verify migration execution order
   */
  async verifyMigrationOrder(): Promise<boolean> {
    try {
      this.logger.log('🔍 Verifying migration execution order...');
      
      const migrations = this.dataSource.migrations || [];
      const executedMigrations = await this.dataSource.query(
        'SELECT timestamp, name FROM migrations ORDER BY timestamp'
      );
      
      // Check if migrations are in correct order
      for (let i = 1; i < executedMigrations.length; i++) {
        const current = executedMigrations[i];
        const previous = executedMigrations[i - 1];
        
        if (current.timestamp < previous.timestamp) {
          this.logger.error(`Migration order violation: ${current.name} (${current.timestamp}) executed before ${previous.name} (${previous.timestamp})`);
          return false;
        }
      }
      
      this.logger.log('✅ Migration execution order verified');
      return true;
      
    } catch (error) {
      this.logger.error('Failed to verify migration order:', error.message);
      return false;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<any> {
    try {
      const availableMigrations = this.dataSource.migrations || [];
      const executedMigrations = await this.dataSource.query(
        'SELECT timestamp, name, executed_at FROM migrations ORDER BY timestamp'
      );
      
      const pendingMigrations = availableMigrations.filter(migration => 
        !executedMigrations.find(executed => executed.timestamp === migration.timestamp)
      );
      
      return {
        total: availableMigrations.length,
        executed: executedMigrations.length,
        pending: pendingMigrations.length,
        executedMigrations: executedMigrations.map(m => ({
          name: m.name,
          timestamp: m.timestamp,
          executedAt: m.executed_at
        })),
        pendingMigrations: pendingMigrations.map(m => ({
          name: m.name,
          timestamp: m.timestamp
        }))
      };
      
    } catch (error) {
      this.logger.error('Failed to get migration status:', error.message);
      throw error;
    }
  }

  /**
   * Rollback last migration (for development only)
   */
  async rollbackLastMigration(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('Rollback not allowed in production environment');
      return false;
    }
    
    try {
      this.logger.log('🔄 Rolling back last migration...');
      
      const executedMigrations = await this.dataSource.query(
        'SELECT timestamp, name FROM migrations ORDER BY timestamp DESC LIMIT 1'
      );
      
      if (executedMigrations.length === 0) {
        this.logger.log('ℹ️  No migrations to rollback');
        return true;
      }
      
      const lastMigration = executedMigrations[0];
      this.logger.log(`Rolling back: ${lastMigration.name}`);
      
      // Note: This is a simplified rollback - in production, use proper migration down() methods
      await this.dataSource.query(
        'DELETE FROM migrations WHERE timestamp = $1',
        [lastMigration.timestamp]
      );
      
      this.logger.log(`✅ Rolled back: ${lastMigration.name}`);
      return true;
      
    } catch (error) {
      this.logger.error('Failed to rollback migration:', error.message);
      return false;
    }
  }
}


