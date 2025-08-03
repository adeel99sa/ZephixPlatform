import { config } from 'dotenv';
import { DatabaseService } from '../src/infrastructure/config/database.config';
import { Logger } from '../src/infrastructure/logging/logger';
import bcrypt from 'bcryptjs';

// Load environment variables
config();

const logger = new Logger('DatabaseSeeder');

async function seedDatabase(): Promise<void> {
  try {
    logger.info('🚀 Starting database seeding...');
    
    const dbService = DatabaseService.getInstance();
    
    // Connect to database
    await dbService.connect();
    logger.info('✅ Database connection established');
    
    // Get data source
    const dataSource = dbService.getDataSource();
    
    // Create test users
    const testUsers = [
      {
        email: 'admin@zephix.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        emailVerified: true
      },
      {
        email: 'user@zephix.com',
        passwordHash: await bcrypt.hash('user123', 12),
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        emailVerified: true
      },
      {
        email: 'developer@zephix.com',
        passwordHash: await bcrypt.hash('dev123', 12),
        firstName: 'Developer',
        lastName: 'User',
        isActive: true,
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
    
    logger.info(`✅ Seeded ${testUsers.length} test users`);
    
    // Log seeded users
    const seededUsers = await dataSource.query('SELECT id, email, "firstName", "lastName", "isActive", "emailVerified" FROM users');
    logger.info('📊 Seeded users:', { users: seededUsers });
    
  } catch (error) {
    logger.error('❌ Database seeding failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  }
}

// Seed database if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('✅ Database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Database seeding failed', { error });
      process.exit(1);
    });
}

export { seedDatabase }; 