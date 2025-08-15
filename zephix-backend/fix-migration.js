// Import your existing data source
const { dataSource } = require('./dist/src/data-source');

async function fixMigration() {
  try {
    // Initialize using your app's existing configuration
    await dataSource.initialize();
    console.log('✅ Connected to database using app configuration');
    
    await dataSource.query(`
      INSERT INTO migrations (timestamp, name) 
      VALUES (1704467100000, 'CreateBRDTable1704467100000')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Migration state fixed!');
    
    // Verify it worked
    const result = await dataSource.query(`
      SELECT * FROM migrations WHERE name = 'CreateBRDTable1704467100000';
    `);
    
    console.log('Migration record:', result);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

fixMigration();
