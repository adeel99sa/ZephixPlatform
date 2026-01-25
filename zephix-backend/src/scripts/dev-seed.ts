import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity';
import { normalizePlatformRole } from '../shared/enums/platform-roles.enum';

async function devSeed() {
  let app;
  try {
    console.log('🌱 Starting dev seed for template proofs...');

    app = await NestFactory.createApplicationContext(AppModule);
    console.log('✅ Application context created');

    const userRepository = app.get(getRepositoryToken(User));
    const orgRepository = app.get(getRepositoryToken(Organization));
    const userOrgRepository = app.get(getRepositoryToken(UserOrganization));
    const dataSource = app.get(DataSource);
    const jwtService = app.get(JwtService);

    // Create or get organization
    let organization = await orgRepository.findOne({
      where: { slug: 'template-proofs-org' },
    });
    if (!organization) {
      organization = orgRepository.create({
        name: 'Template Proofs Organization',
        slug: 'template-proofs-org',
        description: 'Organization for template API proofs',
        status: 'active',
      });
      organization = await orgRepository.save(organization);
      console.log('✅ Created organization');
    } else {
      console.log('✅ Found existing organization');
    }

    // Create three users: Admin, Workspace Owner, Member
    const users = [
      {
        email: 'admin@template-proofs.test',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        orgRole: 'admin' as const,
      },
      {
        email: 'owner@template-proofs.test',
        password: 'Owner123!',
        firstName: 'Workspace',
        lastName: 'Owner',
        role: 'pm',
        orgRole: 'pm' as const,
      },
      {
        email: 'member@template-proofs.test',
        password: 'Member123!',
        firstName: 'Member',
        lastName: 'User',
        role: 'pm',
        orgRole: 'pm' as const,
      },
    ];

    const createdUsers: User[] = [];

    for (const userData of users) {
      let user = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (user) {
        console.log(
          `✅ User ${userData.email} already exists, updating password`,
        );
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
      let userOrg = await userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });

      if (!userOrg) {
        userOrg = userOrgRepository.create({
          userId: user.id,
          organizationId: organization.id,
          role: userData.orgRole,
          isActive: true,
          joinedAt: new Date(),
        });
        userOrg = await userOrgRepository.save(userOrg);
        console.log(
          `✅ Created user-organization relationship for ${userData.email}`,
        );
      }

      createdUsers.push(user);
    }

    const [adminUser, ownerUser, memberUser] = createdUsers;

    // Create workspace using repository
    const workspaceRepository = app.get(getRepositoryToken(Workspace));
    let workspace = await workspaceRepository.findOne({
      where: {
        organizationId: organization.id,
        slug: 'template-proofs-workspace',
        deletedAt: null,
      },
    });

    if (!workspace) {
      console.log('🌱 Creating workspace');
      workspace = workspaceRepository.create({
        name: 'Template Proofs Workspace',
        slug: 'template-proofs-workspace',
        description: 'Workspace for template API proofs',
        organizationId: organization.id,
        createdBy: adminUser.id,
        ownerId: ownerUser.id,
        isPrivate: false,
      });
      workspace = await workspaceRepository.save(workspace);
      console.log('✅ Created workspace');
    } else {
      console.log('✅ Found existing workspace');
    }

    // Ensure workspace memberships exist using repository
    const workspaceMemberRepository = app.get(
      getRepositoryToken(WorkspaceMember),
    );
    const workspaceMembers = [
      { user: adminUser, role: 'workspace_owner' as const },
      { user: ownerUser, role: 'workspace_owner' as const },
      { user: memberUser, role: 'workspace_member' as const },
    ];

    for (const { user, role } of workspaceMembers) {
      let member = await workspaceMemberRepository.findOne({
        where: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      });

      if (!member) {
        member = workspaceMemberRepository.create({
          workspaceId: workspace.id,
          userId: user.id,
          role,
          createdBy: adminUser.id,
          status: 'active',
        });
        member = await workspaceMemberRepository.save(member);
        console.log(
          `✅ Created workspace membership: ${user.email} as ${role}`,
        );
      } else {
        // Update role if needed
        if (member.role !== role) {
          member.role = role;
          member.updatedBy = adminUser.id;
          member = await workspaceMemberRepository.save(member);
          console.log(
            `✅ Updated workspace membership: ${user.email} to ${role}`,
          );
        }
      }
    }

    const workspaceId = workspace.id;

    // Generate JWT tokens - must match auth.service.ts generateToken logic
    const generateToken = async (user: User) => {
      // Get platform role from UserOrganization if available, otherwise normalize user.role
      let platformRole = normalizePlatformRole(user.role);

      const userOrg = await userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
          isActive: true,
        },
      });

      if (userOrg) {
        // Map UserOrganization role to PlatformRole
        platformRole = normalizePlatformRole(userOrg.role);
      }

      const payload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role, // Keep for backward compatibility
        platformRole: platformRole, // Normalized platform role
      };

      // Use 7 days for dev testing (longer than production 15m)
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

      // DEV ONLY: Fallback secret for local development seeding
      // Production code uses ConfigService with strict validation (no fallbacks)
      return jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'fallback-secret-key',
        expiresIn,
      });
    };

    const adminToken = await generateToken(adminUser);
    const ownerToken = await generateToken(ownerUser);
    const memberToken = await generateToken(memberUser);

    // Decode tokens to get expiration times
    const decodeExp = (token: string): Date => {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return new Date(payload.exp * 1000);
    };

    const adminExpiresAt = decodeExp(adminToken);
    const ownerExpiresAt = decodeExp(ownerToken);
    const memberExpiresAt = decodeExp(memberToken);

    // Print outputs
    console.log('\n🎉 Dev seed completed successfully!');
    console.log('\n📋 Outputs for proof capture script:');
    console.log(`export ADMIN_TOKEN="${adminToken}"`);
    console.log(`export OWNER_TOKEN="${ownerToken}"`);
    console.log(`export MEMBER_TOKEN="${memberToken}"`);
    console.log(`export ORG_ID="${organization.id}"`);
    console.log(`export WORKSPACE_ID="${workspaceId}"`);
    console.log('\n📋 Token Expiration Times:');
    console.log(`ADMIN_TOKEN expires at: ${adminExpiresAt.toISOString()}`);
    console.log(`OWNER_TOKEN expires at: ${ownerExpiresAt.toISOString()}`);
    console.log(`MEMBER_TOKEN expires at: ${memberExpiresAt.toISOString()}`);
    console.log('\n📋 Test Users:');
    console.log(`Admin:  ${adminUser.email} / Admin123!`);
    console.log(`Owner:  ${ownerUser.email} / Owner123!`);
    console.log(`Member: ${memberUser.email} / Member123!`);
  } catch (error) {
    console.error('❌ Error in dev seed:', error);
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
  devSeed()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { devSeed };
