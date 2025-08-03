import { config } from 'dotenv';
import { DatabaseService } from '../src/infrastructure/config/database.config';
import { Logger } from '../src/infrastructure/logging/logger';

// Load environment variables
config();

const logger = new Logger('MigrationReverter');

async function revertMigrations(): Promise<void> {
  try {
    logger.info('🚀 Starting migration revert...');
    
    const dbService = DatabaseService.getInstance();
    
    // Connect to database
    await dbService.connect();
    logger.info('✅ Database connection established');
    
    // Get data source
    const dataSource = dbService.getDataSource();
    
    // Revert last migration
    const lastMigration = await dataSource.undoLastMigration();
    if (lastMigration) {
      logger.info(`✅ Reverted migration: ${lastMigration.name}`);
    } else {
      logger.info('ℹ️ No migrations to revert');
    }
    
  } catch (error) {
    logger.error('❌ Migration revert failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  }
}

// Revert migrations if called directly
if (require.main === module) {
  revertMigrations()
    .then(() => {
      logger.info('✅ Migration revert completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration revert failed', { error });
      process.exit(1);
    });
}

export { revertMigrations }; 