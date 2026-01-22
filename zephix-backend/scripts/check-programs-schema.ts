import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

async function checkSchema() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway')
      ? { rejectUnauthorized: false }
      : false,
  });

  await dataSource.initialize();

  try {
    // Check programs table columns
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'programs'
      ORDER BY column_name;
    `);

    console.log('\n📋 Programs table columns:');
    console.log(JSON.stringify(columns, null, 2));

    // Check if portfolio_id exists
    const hasPortfolioId = columns.some(
      (col: any) => col.column_name === 'portfolio_id'
    );
    console.log(`\n✅ portfolio_id exists: ${hasPortfolioId}`);

    // Check for any portfolio-related columns
    const portfolioCols = columns.filter((col: any) =>
      col.column_name.toLowerCase().includes('portfolio')
    );
    console.log('\n🔍 Portfolio-related columns:');
    console.log(JSON.stringify(portfolioCols, null, 2));
  } finally {
    await dataSource.destroy();
  }
}

checkSchema().catch(console.error);
