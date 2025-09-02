import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './modules/users/entities/user.entity';
import { Organization } from './modules/organizations/entities/organization.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { UserOrganization } from './modules/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://malikadeel@localhost:5432/zephix_development',
  entities: [User, Organization, RefreshToken, UserOrganization],
  synchronize: false,
  logging: true,
});

async function testSignup() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    const userRepo = AppDataSource.getRepository(User);
    const orgRepo = AppDataSource.getRepository(Organization);
    const userOrgRepo = AppDataSource.getRepository(UserOrganization);

    // Test data
    const email = 'test@example.com';
    const password = 'Test1234!';
    const firstName = 'Test';
    const lastName = 'User';
    const organizationName = 'Test Organization';

    console.log('🔍 Checking if user exists...');
    const existingUser = await userRepo.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log('❌ User already exists');
      return;
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('🏢 Creating organization...');
    const organization = orgRepo.create({
      name: organizationName,
      slug: `test-org-${Date.now()}`,
      status: 'trial',
    });
    const savedOrg = await orgRepo.save(organization);
    console.log('✅ Organization created:', savedOrg.id);

    console.log('👤 Creating user...');
    const user = userRepo.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin',
      isActive: true,
      organizationId: savedOrg.id,
    });
    const savedUser = await userRepo.save(user);
    console.log('✅ User created:', savedUser.id);

    console.log('🔗 Creating user-organization relationship...');
    const userOrg = userOrgRepo.create({
      userId: savedUser.id,
      organizationId: savedOrg.id,
      role: 'owner',
      isActive: true,
      permissions: {},
      joinedAt: new Date(),
    });
    await userOrgRepo.save(userOrg);
    console.log('✅ User-organization relationship created');

    console.log('🎉 Signup test successful!');
    console.log('User ID:', savedUser.id);
    console.log('Organization ID:', savedOrg.id);
    
  } catch (error) {
    console.error('❌ Signup test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await AppDataSource.destroy();
  }
}

testSignup();
