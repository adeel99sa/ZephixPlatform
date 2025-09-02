import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './modules/users/entities/user.entity';
import { Organization } from './modules/organizations/entities/organization.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://malikadeel@localhost:5432/zephix_development',
  entities: [User, Organization, RefreshToken],
  synchronize: false,
  logging: true,
});

async function testAuth() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    console.log('🔍 Testing User entity query...');
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({ take: 1 });
    console.log('✅ User query successful, found users:', users.length);

    console.log('🔍 Testing Organization entity query...');
    const orgRepo = AppDataSource.getRepository(Organization);
    const orgs = await orgRepo.find({ take: 1 });
    console.log('✅ Organization query successful, found orgs:', orgs.length);

    console.log('🔍 Testing RefreshToken entity query...');
    const tokenRepo = AppDataSource.getRepository(RefreshToken);
    const tokens = await tokenRepo.find({ take: 1 });
    console.log('✅ RefreshToken query successful, found tokens:', tokens.length);

    console.log('🎉 All entity tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await AppDataSource.destroy();
  }
}

testAuth();
