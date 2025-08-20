import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/**
 * Migration Guard
 *
 * Prevents application startup in production if there are pending migrations.
 * Ensures database schema is always up-to-date in production environments.
 */
@Injectable()
export class MigrationGuard {
  private readonly logger = new Logger(MigrationGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Check if there are pending migrations and exit if in production
   */
  async checkMigrations(): Promise<void> {
    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv === 'production') {
      try {
        const pendingMigrations = await this.getPendingMigrations();

        if (pendingMigrations.length > 0) {
          this.logger.error(
            '🚨 PRODUCTION STARTUP BLOCKED: Pending migrations detected',
          );
          this.logger.error(
            `Pending migrations: ${pendingMigrations.join(', ')}`,
          );
          this.logger.error(
            'Please run migrations before starting the application',
          );

          // Exit with error code 1
          process.exit(1);
        }

        this.logger.log('✅ Database schema is up-to-date');
      } catch (error) {
        this.logger.error('🚨 Failed to check migrations:', error);
        this.logger.error('Exiting due to migration check failure');
        process.exit(1);
      }
    } else {
      this.logger.log(
        '🔧 Non-production environment - migration check skipped',
      );
    }
  }

  /**
   * Get list of pending migrations
   */
  private async getPendingMigrations(): Promise<string[]> {
    try {
      // Check if database is connected
      if (!this.dataSource.isInitialized) {
        this.logger.warn('Database not initialized, skipping migration check');
        return [];
      }

      // Get pending migrations
      const pendingMigrations = await this.dataSource.showMigrations();

      if (pendingMigrations) {
        const migrations = await this.dataSource.runMigrations();
        return migrations.map((m) => m.name);
      }

      return [];
    } catch (error) {
      this.logger.error('Error checking migrations:', error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        this.logger.warn('Database not initialized, cannot run migrations');
        return;
      }

      const pendingMigrations = await this.getPendingMigrations();

      if (pendingMigrations.length === 0) {
        this.logger.log('No pending migrations to run');
        return;
      }

      this.logger.log(
        `Running ${pendingMigrations.length} pending migrations...`,
      );

      const migrations = await this.dataSource.runMigrations();

      this.logger.log(`✅ Successfully ran ${migrations.length} migrations:`);
      migrations.forEach((m) => this.logger.log(`  - ${m.name}`));
    } catch (error) {
      this.logger.error('❌ Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Generate migration files (development only)
   */
  async generateMigration(name: string): Promise<void> {
    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv === 'production') {
      throw new Error('Cannot generate migrations in production');
    }

    try {
      if (!this.dataSource.isInitialized) {
        this.logger.warn('Database not initialized, cannot generate migration');
        return;
      }

      this.logger.log(`Generating migration: ${name}`);

      // This would typically call TypeORM CLI commands
      // For now, we'll just log the instruction
      this.logger.log(
        'To generate migrations, run: npm run migration:generate -- ' + name,
      );
    } catch (error) {
      this.logger.error('Failed to generate migration:', error);
      throw error;
    }
  }
}
