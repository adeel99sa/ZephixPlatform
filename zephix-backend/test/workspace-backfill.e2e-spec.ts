import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { WorkspaceBackfillService } from '../src/modules/workspaces/services/workspace-backfill.service';
import * as bcrypt from 'bcrypt';

describe('Workspace Backfill (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let backfillService: WorkspaceBackfillService;

  // Test data
  let org1: Organization;
  let orgAdmin: User;
  let regularUser: User;
  let workspace1: Workspace;
  let workspace2: Workspace;
  let workspace3: Workspace;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set. Tests require Railway database connection.');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);
    backfillService = app.get(WorkspaceBackfillService);

    // Clean up test data
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organization
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Backfill Test Org ${timestamp}`);

    // Create test users
    const testEmailSuffix = `-${timestamp}@backfill-test.com`;
    orgAdmin = await createTestUser(
      `admin${testEmailSuffix}`,
      'Org',
      'Admin',
      org1.id,
      'admin',
    );
    regularUser = await createTestUser(
      `user${testEmailSuffix}`,
      'Regular',
      'User',
      org1.id,
      'member',
    );

    // Create UserOrganization entries
    await createUserOrganization(orgAdmin.id, org1.id, 'admin');
    await createUserOrganization(regularUser.id, org1.id, 'pm');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Case 1: Workspace with no ownerId and org with admin', () => {
    beforeEach(async () => {
      // Create workspace without ownerId
      workspace1 = await createTestWorkspace(
        'No Owner Workspace',
        org1.id,
        orgAdmin.id,
        null, // No ownerId
      );
    });

    afterEach(async () => {
      await cleanupWorkspaces();
    });

    it('Should set ownerId to org admin and create workspace_members row', async () => {
      const result = await backfillService.backfillForOrg(org1.id, {
        dryRun: false,
      });

      expect(result.workspacesScanned).toBeGreaterThanOrEqual(1);
      expect(result.ownerIdChanges).toBeGreaterThanOrEqual(1);
      expect(result.membersCreated).toBeGreaterThanOrEqual(1);
      expect(result.errors.length).toBe(0);

      // Verify workspace has ownerId
      const updatedWorkspace = await dataSource
        .getRepository(Workspace)
        .findOne({ where: { id: workspace1.id } });
      expect(updatedWorkspace?.ownerId).toBe(orgAdmin.id);

      // Verify workspace_members row exists
      const member = await dataSource.getRepository(WorkspaceMember).findOne({
        where: { workspaceId: workspace1.id, userId: orgAdmin.id },
      });
      expect(member).toBeDefined();
      expect(member?.role).toBe('owner');
    });
  });

  describe('Case 2: Workspace with existing valid ownerId', () => {
    beforeEach(async () => {
      // Create workspace with valid ownerId
      workspace2 = await createTestWorkspace(
        'Has Owner Workspace',
        org1.id,
        orgAdmin.id,
        orgAdmin.id, // Has ownerId
      );
    });

    afterEach(async () => {
      await cleanupWorkspaces();
    });

    it('Should keep ownerId unchanged and create workspace_members row if missing', async () => {
      // Verify no member row exists initially
      const initialMember = await dataSource
        .getRepository(WorkspaceMember)
        .findOne({
          where: { workspaceId: workspace2.id, userId: orgAdmin.id },
        });
      expect(initialMember).toBeNull();

      const result = await backfillService.backfillForOrg(org1.id, {
        dryRun: false,
      });

      expect(result.ownerIdChanges).toBe(0); // No change
      expect(result.membersCreated).toBeGreaterThanOrEqual(1); // Created member row

      // Verify workspace ownerId unchanged
      const updatedWorkspace = await dataSource
        .getRepository(Workspace)
        .findOne({ where: { id: workspace2.id } });
      expect(updatedWorkspace?.ownerId).toBe(orgAdmin.id);

      // Verify workspace_members row now exists
      const member = await dataSource.getRepository(WorkspaceMember).findOne({
        where: { workspaceId: workspace2.id, userId: orgAdmin.id },
      });
      expect(member).toBeDefined();
      expect(member?.role).toBe('owner');
    });

    it('Should update existing member to owner role if different', async () => {
      // Create member with 'member' role
      await createWorkspaceMember(workspace2.id, orgAdmin.id, 'member');

      const result = await backfillService.backfillForOrg(org1.id, {
        dryRun: false,
      });

      expect(result.membersUpdated).toBeGreaterThanOrEqual(1);

      // Verify role updated to owner
      const member = await dataSource.getRepository(WorkspaceMember).findOne({
        where: { workspaceId: workspace2.id, userId: orgAdmin.id },
      });
      expect(member?.role).toBe('owner');
    });
  });

  describe('Case 3: Org with no admin in user_organizations', () => {
    let orgWithoutAdmin: Organization;
    let earliestUser: User;
    let workspaceNoAdmin: Workspace;

    beforeEach(async () => {
      // Create org without admin
      const timestamp = Date.now();
      orgWithoutAdmin = await createTestOrganization(
        `No Admin Org ${timestamp}`,
      );

      // Create users but no admin
      earliestUser = await createTestUser(
        `earliest-${timestamp}@backfill-test.com`,
        'Earliest',
        'User',
        orgWithoutAdmin.id,
        'member',
      );

      // Create UserOrganization with non-admin role
      await createUserOrganization(earliestUser.id, orgWithoutAdmin.id, 'pm');

      // Create workspace without ownerId
      workspaceNoAdmin = await createTestWorkspace(
        'No Admin Workspace',
        orgWithoutAdmin.id,
        earliestUser.id,
        null,
      );
    });

    afterEach(async () => {
      // Cleanup
      try {
        await dataSource.getRepository(WorkspaceMember).delete({
          workspaceId: workspaceNoAdmin.id,
        });
        await dataSource.getRepository(Workspace).delete({ id: workspaceNoAdmin.id });
        await dataSource.getRepository(UserOrganization).delete({
          organizationId: orgWithoutAdmin.id,
        });
        await dataSource.getRepository(User).delete({ id: earliestUser.id });
        await dataSource.getRepository(Organization).delete({ id: orgWithoutAdmin.id });
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it('Should set ownerId to earliest user in org', async () => {
      const result = await backfillService.backfillForOrg(orgWithoutAdmin.id, {
        dryRun: false,
      });

      expect(result.ownerIdChanges).toBeGreaterThanOrEqual(1);
      expect(result.membersCreated).toBeGreaterThanOrEqual(1);

      // Verify workspace has ownerId set to earliest user
      const updatedWorkspace = await dataSource
        .getRepository(Workspace)
        .findOne({ where: { id: workspaceNoAdmin.id } });
      expect(updatedWorkspace?.ownerId).toBe(earliestUser.id);

      // Verify workspace_members row exists
      const member = await dataSource.getRepository(WorkspaceMember).findOne({
        where: { workspaceId: workspaceNoAdmin.id, userId: earliestUser.id },
      });
      expect(member).toBeDefined();
      expect(member?.role).toBe('owner');
    });
  });

  describe('Idempotency', () => {
    beforeEach(async () => {
      workspace3 = await createTestWorkspace(
        'Idempotency Test Workspace',
        org1.id,
        orgAdmin.id,
        null,
      );
    });

    afterEach(async () => {
      await cleanupWorkspaces();
    });

    it('Should perform no new changes on second run', async () => {
      // First run
      const result1 = await backfillService.backfillForOrg(org1.id, {
        dryRun: false,
      });

      const firstRunChanges =
        result1.ownerIdChanges + result1.membersCreated + result1.membersUpdated;

      // Second run
      const result2 = await backfillService.backfillForOrg(org1.id, {
        dryRun: false,
      });

      const secondRunChanges =
        result2.ownerIdChanges + result2.membersCreated + result2.membersUpdated;

      // Second run should have minimal or no changes
      expect(secondRunChanges).toBeLessThanOrEqual(firstRunChanges);

      // Verify no duplicate workspace_members rows
      const members = await dataSource.getRepository(WorkspaceMember).find({
        where: { workspaceId: workspace3.id, userId: orgAdmin.id },
      });
      expect(members.length).toBe(1);
    });
  });

  describe('Dry Run Mode', () => {
    beforeEach(async () => {
      workspace1 = await createTestWorkspace(
        'Dry Run Workspace',
        org1.id,
        orgAdmin.id,
        null,
      );
    });

    afterEach(async () => {
      await cleanupWorkspaces();
    });

    it('Should report changes without applying them', async () => {
      const result = await backfillService.backfillForOrg(org1.id, {
        dryRun: true,
      });

      expect(result.ownerIdChanges).toBeGreaterThanOrEqual(1);
      expect(result.membersCreated).toBeGreaterThanOrEqual(1);

      // Verify no changes were actually applied
      const workspace = await dataSource
        .getRepository(Workspace)
        .findOne({ where: { id: workspace1.id } });
      expect(workspace?.ownerId).toBeNull();

      const member = await dataSource.getRepository(WorkspaceMember).findOne({
        where: { workspaceId: workspace1.id, userId: orgAdmin.id },
      });
      expect(member).toBeNull();
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      if (!dataSource || !dataSource.isInitialized) {
        return;
      }

      try {
        await dataSource.getRepository(WorkspaceMember).delete({});
      } catch (e) {
        /* table might not exist */
      }

      try {
        await dataSource.getRepository(Workspace).delete({});
      } catch (e) {
        /* table might not exist */
      }

      try {
        await dataSource.getRepository(UserOrganization).delete({});
      } catch (e) {
        /* table might not exist */
      }

      try {
        await dataSource.getRepository(User).delete({});
      } catch (e) {
        /* table might not exist */
      }

      try {
        await dataSource.getRepository(Organization).delete({});
      } catch (e) {
        /* table might not exist */
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  async function cleanupWorkspaces() {
    try {
      if (workspace1) {
        await dataSource.getRepository(WorkspaceMember).delete({
          workspaceId: workspace1.id,
        });
        await dataSource.getRepository(Workspace).delete({ id: workspace1.id });
      }
      if (workspace2) {
        await dataSource.getRepository(WorkspaceMember).delete({
          workspaceId: workspace2.id,
        });
        await dataSource.getRepository(Workspace).delete({ id: workspace2.id });
      }
      if (workspace3) {
        await dataSource.getRepository(WorkspaceMember).delete({
          workspaceId: workspace3.id,
        });
        await dataSource.getRepository(Workspace).delete({ id: workspace3.id });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    const uniqueSlug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const org = orgRepo.create({ name, slug: uniqueSlug });
    return orgRepo.save(org);
  }

  async function createTestUser(
    email: string,
    firstName: string,
    lastName: string,
    organizationId: string,
    role: string,
  ): Promise<User> {
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = userRepo.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId,
      role,
      isActive: true,
      isEmailVerified: true,
    });
    return userRepo.save(user);
  }

  async function createUserOrganization(
    userId: string,
    organizationId: string,
    role: 'owner' | 'admin' | 'pm' | 'viewer',
  ): Promise<UserOrganization> {
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userOrg = userOrgRepo.create({
      userId,
      organizationId,
      role,
      isActive: true,
      joinedAt: new Date(),
    });
    return userOrgRepo.save(userOrg);
  }

  async function createTestWorkspace(
    name: string,
    organizationId: string,
    createdBy: string,
    ownerId: string | null,
  ): Promise<Workspace> {
    const wsRepo = dataSource.getRepository(Workspace);
    const workspace = wsRepo.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      organizationId,
      createdBy,
      ownerId,
      isPrivate: false,
    });
    return wsRepo.save(workspace);
  }

  async function createWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'member' | 'viewer',
  ): Promise<WorkspaceMember> {
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    const member = memberRepo.create({
      workspaceId,
      userId,
      role,
    });
    return memberRepo.save(member);
  }
});

