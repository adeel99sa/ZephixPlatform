const { AppDataSource } = require('./src/infrastructure/config/database.config');

async function setupUUID() {
  try {
    console.log('🔧 Setting up UUID extension...');
    
    await AppDataSource.initialize();
    
    // Enable UUID extension in PostgreSQL
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');
    
    // Test UUID generation
    const result = await AppDataSource.query('SELECT uuid_generate_v4() as test_uuid');
    console.log('✅ UUID generation test passed:', result[0].test_uuid);
    
    await AppDataSource.destroy();
    console.log('✅ UUID setup completed successfully');
  } catch (error) {
    console.error('❌ UUID setup failed:', error.message);
    process.exit(1);
  }
}

setupUUID(); 