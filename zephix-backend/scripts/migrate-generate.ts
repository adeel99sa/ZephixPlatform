import { config } from 'dotenv';

// Load environment variables
config();

async function generateMigration(migrationName: string): Promise<void> {
  try {
    console.log(`🚀 Generating migration: ${migrationName}`);
    
    // Generate migration using TypeORM CLI
    const { execSync } = require('child_process');
    const command = `npx typeorm-ts-node-commonjs migration:generate -d src/data-source.ts src/database/migrations/${migrationName}`;
    
    console.log(`📝 Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ Migration generation completed');
    console.log(`📁 Check src/database/migrations/ for the new migration file`);
    
  } catch (error) {
    console.error('❌ Migration generation failed:', error);
    throw error;
  }
}

// Generate migration if called directly
if (require.main === module) {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('❌ Migration name is required');
    console.log('Usage: npm run db:migrate:generate <migration-name>');
    process.exit(1);
  }
  
  generateMigration(migrationName)
    .then(() => {
      console.log('✅ Migration generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration generation failed:', error);
      process.exit(1);
    });
}

export { generateMigration };
