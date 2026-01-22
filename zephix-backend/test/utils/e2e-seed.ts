import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import { Workspace } from '../../src/modules/workspaces/entities/workspace.entity';

export interface SeededData {
  orgId: string;
  userId: string;
  workspaceId: string;
  token: string;
  email: string;
  password: string;
}

/**
 * Seed deterministic test data for Workspace MVP smoke tests
 * 
 * Creates:
 * - Organization: "E2E Test Org"
 * - User: demo@zephix.ai with password "demo123456"
 * - Workspace: "E2E Test Workspace"
 * - JWT token for the user
 * 
 * Uses orgId-first repository calls throughout.
 */
export async function seedWorkspaceMvp(
  app: INestApplication,
): Promise<SeededData> {
  const dataSource = app.get(DataSource);

  // Constants for deterministic seed
  const email = 'demo@zephix.ai';
  const password = 'demo123456';
  const orgName = 'E2E Test Org';
  const workspaceName = 'E2E Test Workspace';

  // Get repositories (regular TypeORM repos for seed data creation)
  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);
  const userOrgRepo = dataSource.getRepository(UserOrganization);
  const workspaceRepo = dataSource.getRepository(Workspace);

  // Check if seed data already exists
  let existingUser = await userRepo.findOne({
    where: { email },
  });

  if (existingUser) {
    // Find or create org
    const existingOrg = await orgRepo.findOne({
      where: { id: existingUser.organizationId },
    });

    if (!existingOrg) {
      throw new Error('User exists but organization not found');
    }

    // Find or create workspace
    let existingWorkspace = await workspaceRepo.findOne({
      where: {
        organizationId: existingOrg.id,
        name: workspaceName,
      },
    });

    if (!existingWorkspace) {
      existingWorkspace = workspaceRepo.create({
        name: workspaceName,
        slug: workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        organizationId: existingOrg.id,
        createdBy: existingUser.id,
        isPrivate: false,
      });
      await workspaceRepo.save(existingWorkspace);
    }

  // Generate token
  const token = generateToken(existingUser, existingOrg.id);

    return {
      orgId: existingOrg.id,
      userId: existingUser.id,
      workspaceId: existingWorkspace.id,
      token,
      email,
      password,
    };
  }

  // Create new seed data
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create organization
  const org = orgRepo.create({
    name: orgName,
    slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    settings: {},
  });
  const savedOrg = await orgRepo.save(org);

  // Create user
  const user = userRepo.create({
    email,
    password: hashedPassword,
    firstName: 'Demo',
    lastName: 'User',
    organizationId: savedOrg.id,
    isEmailVerified: true,
    role: 'admin',
  });
  const savedUser = await userRepo.save(user);

  // Create UserOrganization link
  const userOrg = userOrgRepo.create({
    userId: savedUser.id,
    organizationId: savedOrg.id,
    role: 'admin',
  });
  await userOrgRepo.save(userOrg);

  // Create workspace
  const workspace = workspaceRepo.create({
    name: workspaceName,
    slug: workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    organizationId: savedOrg.id,
    createdBy: savedUser.id,
    isPrivate: false,
  });
  const savedWorkspace = await workspaceRepo.save(workspace);

  // Generate token
  const token = generateToken(savedUser, savedOrg.id);

  return {
    orgId: savedOrg.id,
    userId: savedUser.id,
    workspaceId: savedWorkspace.id,
    token,
    email,
    password,
  };
}

/**
 * Generate JWT token for user
 */
function generateToken(user: User, organizationId: string): string {
  const payload = {
    sub: user.id,
    email: user.email,
    organizationId,
    role: user.role,
    platformRole: 'ADMIN',
  };

  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}
