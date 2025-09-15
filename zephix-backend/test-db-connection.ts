import { DataSource } from 'typeorm';
import { Organization } from './src/organizations/entities/organization.entity';

const testConnection = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Organization],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection successful');
    
    // Test query
    const orgs = await dataSource.getRepository(Organization)
      .createQueryBuilder('org')
      .select(['org.id', 'org.name', 'org.createdAt', 'org.updatedAt'])
      .limit(1)
      .getRawMany();
    
    console.log('✅ Query successful:', orgs);
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
};

testConnection();
