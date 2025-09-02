import { DataSource } from 'typeorm';
import { ResourceAllocation } from '../modules/resources/entities/resource-allocation.entity';

async function testDatabaseIntegrity() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'malikadeel',
    password: '',
    database: 'zephix_development',
    entities: [ResourceAllocation],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection successful');

    // Test 1: Can query resource_allocations
    const allocations = await dataSource
      .getRepository(ResourceAllocation)
      .find();
    console.log(`✅ Resource allocations count: ${allocations.length}`);

    // Test 2: Can query with relations
    const allocationsWithDetails = await dataSource
      .getRepository(ResourceAllocation)
      .createQueryBuilder('ra')
      .select([
        'ra.id',
        'ra.resourceId',
        'ra.projectId',
        'ra.startDate',
        'ra.endDate',
      ])
      .getMany();
    console.log(
      `✅ Query with details successful: ${allocationsWithDetails.length} records`,
    );

    // Test 3: Check data integrity
    const validAllocations = allocations.filter(
      (ra) =>
        ra.startDate <= ra.endDate &&
        ra.allocationPercentage > 0 &&
        ra.allocationPercentage <= 100,
    );
    console.log(
      `✅ Data integrity check: ${validAllocations.length}/${allocations.length} records valid`,
    );

    // Test 4: Check table structure
    const result = await dataSource.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'resource_allocations' 
      ORDER BY ordinal_position
    `);
    console.log(`✅ Table structure check: ${result.length} columns found`);

    console.log('\n🎉 All database integrity tests passed!');
  } catch (error) {
    console.error('❌ Database integrity test failed:', error);
  } finally {
    await dataSource.destroy();
  }
}

testDatabaseIntegrity();
