import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

async function seedUsers() {
  let app;
  try {
    console.log('🌱 Starting user seeding...');

    app = await NestFactory.createApplicationContext(AppModule);
    console.log('✅ Application context created');

    const userRepository = app.get(getRepositoryToken(User));
    const orgRepository = app.get(getRepositoryToken(Organization));
    const userOrgRepository = app.get(getRepositoryToken(UserOrganization));

    // Create or get the default organization
    let organization = await orgRepository.findOne({
      where: { name: 'Zephix AI' },
    });
    if (!organization) {
      organization = orgRepository.create({
        name: 'Zephix AI',
        slug: 'zephix-ai',
        description: 'Default organization for Zephix AI platform',
        isActive: true,
      });
      organization = await orgRepository.save(organization);
      console.log('✅ Created default organization');
    } else {
      console.log('✅ Found existing organization');
    }

    // Seed users with deterministic passwords
    const seedUsers = [
      {
        email: 'admin@zephix.ai',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const,
        orgRole: 'admin' as const,
      },
      {
        email: 'member@zephix.ai',
        password: 'Member123!',
        firstName: 'Member',
        lastName: 'User',
        role: 'pm' as const,
        orgRole: 'pm' as const,
      },
      {
        email: 'viewer@zephix.ai',
        password: 'Viewer123!',
        firstName: 'Viewer',
        lastName: 'User',
        role: 'viewer' as const,
        orgRole: 'viewer' as const,
      },
    ];

    for (const userData of seedUsers) {
      // Check if user already exists
      let user = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (user) {
        console.log(
          `✅ User ${userData.email} already exists, updating password`,
        );
        // Update password hash
        user.password = await bcrypt.hash(userData.password, 10);
        user = await userRepository.save(user);
      } else {
        console.log(`🌱 Creating user ${userData.email}`);
        user = userRepository.create({
          email: userData.email,
          password: await bcrypt.hash(userData.password, 10),
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          organizationId: organization.id,
        });
        user = await userRepository.save(user);
      }

      // Ensure user-organization relationship exists
      const userOrg = await userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });

      if (!userOrg) {
        await userOrgRepository.save({
          userId: user.id,
          organizationId: organization.id,
          role: userData.orgRole,
          isActive: true,
        });
        console.log(
          `✅ Created user-organization relationship for ${userData.email}`,
        );
      }
    }

    console.log('🎉 User seeding completed successfully!');
    console.log('\n📋 Test Users:');
    console.log('Admin:  admin@zephix.ai / Admin123!');
    console.log('Member: member@zephix.ai / Member123!');
    console.log('Viewer: viewer@zephix.ai / Viewer123!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    if (app) {
      await app.close();
      console.log('✅ Application context closed');
    }
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedUsers };
