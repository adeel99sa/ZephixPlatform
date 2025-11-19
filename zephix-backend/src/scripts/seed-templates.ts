import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedTemplates } from '../database/seeds/templates.seed';
import { ProjectTemplate } from '../modules/templates/entities/project-template.entity';

config();

/**
 * Script to seed system templates
 * Run with: npm run seed:templates
 * or: ts-node src/scripts/seed-templates.ts
 */
async function runSeed() {
  let dataSource: DataSource | null = null;

  try {
    console.log('🌱 Starting template seed...');

    // Create data source with explicit config
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [ProjectTemplate],
      synchronize: false,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

    await dataSource.initialize();
    console.log('✅ Database connected');

    await seedTemplates(dataSource);

    console.log('✅ Template seeding completed successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

runSeed();
