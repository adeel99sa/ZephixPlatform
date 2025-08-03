import { config } from 'dotenv';
import { DatabaseService } from '../src/infrastructure/config/database.config';
import { Logger } from '../src/infrastructure/logging/logger';
import bcrypt from 'bcryptjs';

// Load environment variables
config();

const logger = new Logger('TestDatabaseSeeder');

async function seedTestDatabase(): Promise<void> {
  try {
    logger.info('🚀 Starting test database seeding...');
    
    const dbService = DatabaseService.getInstance();
    
    // Connect to database
    await dbService.connect();
    logger.info('✅ Test database connection established');
    
    // Get data source
    const dataSource = dbService.getDataSource();
    
    // Create test users for testing
    const testUsers = [
      {
        email: 'test@zephix.com',
        passwordHash: await bcrypt.hash('test123', 12),
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        emailVerified: true
      },
      {
        email: 'inactive@zephix.com',
        passwordHash: await bcrypt.hash('inactive123', 12),
        firstName: 'Inactive',
        lastName: 'User',
        isActive: false,
        emailVerified: false
      }
    ];
    
    // Insert test users
    for (const user of testUsers) {
      await dataSource.query(`
        INSERT INTO users (email, "passwordHash", "firstName", "lastName", "isActive", "emailVerified", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO NOTHING
      `, [user.email, user.passwordHash, user.firstName, user.lastName, user.isActive, user.emailVerified]);
    }
    
    logger.info(`✅ Seeded ${testUsers.length} test users for testing`);
    
  } catch (error) {
    logger.error('❌ Test database seeding failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  }
}

// Seed test database if called directly
if (require.main === module) {
  seedTestDatabase()
    .then(() => {
      logger.info('✅ Test database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Test database seeding failed', { error });
      process.exit(1);
    });
}

export { seedTestDatabase }; 