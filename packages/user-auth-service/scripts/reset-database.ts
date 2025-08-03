import { config } from 'dotenv';
import { DatabaseService } from '../src/infrastructure/config/database.config';
import { Logger } from '../src/infrastructure/logging/logger';

// Load environment variables
config();

const logger = new Logger('DatabaseReset');

async function resetDatabase(): Promise<void> {
  try {
    logger.info('🚀 Starting database reset...');
    
    const dbService = DatabaseService.getInstance();
    
    // Connect to database
    await dbService.connect();
    logger.info('✅ Database connection established');
    
    // Get data source
    const dataSource = dbService.getDataSource();
    
    // Drop all tables (DANGEROUS - only for development)
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ Dropping all tables (development mode only)');
      await dataSource.dropDatabase();
      logger.info('✅ Database dropped successfully');
      
      // Recreate database
      await dataSource.synchronize();
      logger.info('✅ Database recreated successfully');
      
      // Run migrations
      await dbService.runMigrations();
      logger.info('✅ Migrations applied successfully');
    } else {
      logger.error('❌ Database reset is only allowed in development mode');
      throw new Error('Database reset is only allowed in development mode');
    }
    
  } catch (error) {
    logger.error('❌ Database reset failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  }
}

// Reset database if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      logger.info('✅ Database reset completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Database reset failed', { error });
      process.exit(1);
    });
}

export { resetDatabase }; 