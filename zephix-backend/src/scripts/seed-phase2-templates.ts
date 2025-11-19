import 'reflect-metadata';
import { config } from 'dotenv';
import AppDataSource from '../config/data-source';
import { seedPhase2Templates } from '../database/seeds/templates-phase2.seed';

// Load environment variables
config();

async function main() {
  console.log('🌱 Starting Phase 2.3 template seeding...\n');

  const dataSource = AppDataSource;

  try {
    // Use the main app's DataSource configuration which includes all entities
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log('✅ Database connection established');
    } else {
      console.log('✅ Using existing database connection');
    }

    // Run seeding
    await seedPhase2Templates(dataSource);

    console.log('\n✅ Phase 2.3 template seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as seedPhase2Templates };
