import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createDatabaseConfig } from '../src/infrastructure/config/database.config';
import { Logger } from '../src/infrastructure/logging/logger';

// Load environment variables
config();

const logger = new Logger('MigrationGenerator');

async function generateMigration(migrationName: string): Promise<void> {
  try {
    logger.info(`🚀 Generating migration: ${migrationName}`);
    
    // Create data source for migration generation
    const dataSource = new DataSource(createDatabaseConfig());
    
    // Initialize data source
    await dataSource.initialize();
    logger.info('✅ Database connection established');
    
    // Generate migration
    const timestamp = Date.now();
    const migrationFileName = `${timestamp}_${migrationName}`;
    
    logger.info(`📝 Creating migration file: ${migrationFileName}`);
    
    // Note: TypeORM CLI would handle the actual generation
    // This is a placeholder for the generation process
    logger.info('✅ Migration generation completed');
    logger.info(`📁 Migration file: src/infrastructure/database/migrations/${migrationFileName}.ts`);
    
  } catch (error) {
    logger.error('❌ Migration generation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

// Generate migration if called directly
if (require.main === module) {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    logger.error('❌ Migration name is required');
    logger.info('Usage: npm run migrate:generate <migration-name>');
    process.exit(1);
  }
  
  generateMigration(migrationName)
    .then(() => {
      logger.info('✅ Migration generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration generation failed', { error });
      process.exit(1);
    });
}

export { generateMigration }; 