import { config } from 'dotenv';
import { DatabaseService } from '../src/infrastructure/config/database.config';
import { Logger } from '../src/infrastructure/logging/logger';

// Load environment variables
config();

const logger = new Logger('DatabaseSetup');

async function setupDatabase(): Promise<void> {
  try {
    logger.info('🚀 Starting database setup...');
    
    const dbService = DatabaseService.getInstance();
    
    // Connect to database
    await dbService.connect();
    logger.info('✅ Database connection established');
    
    // Run migrations
    await dbService.runMigrations();
    logger.info('✅ Database migrations completed');
    
    // Test connection
    const isHealthy = await dbService.testConnection();
    if (isHealthy) {
      logger.info('✅ Database health check passed');
    } else {
      throw new Error('Database health check failed');
    }
    
    // Get connection stats
    const stats = dbService.getConnectionStats();
    logger.info('📊 Database connection stats', { stats });
    
    logger.info('🎉 Database setup completed successfully!');
    
  } catch (error) {
    logger.error('❌ Database setup failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      logger.info('✅ Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Database setup failed', { error });
      process.exit(1);
    });
}

export { setupDatabase }; 