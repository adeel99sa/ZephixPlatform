/**
 * PROMPT 10: Backend E2E Tests for Workspace Slug Resolution
 *
 * Tests:
 * - Resolve workspace by slug returns workspaceId
 * - 404 for non-existent slug
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { PlatformRole } from '../src/shared/enums/platform-roles.enum';

describe('Workspace Slug Resolve (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userToken: string;
  let userId: string;
  let orgId: string;
  let workspaceId: string;
  const workspaceSlug = 'test-workspace';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    const org = orgRepo.create({
      name: 'Test Org',
      slug: 'test-org',
    });
    const savedOrg = await orgRepo.save(org);
    orgId = savedOrg.id;

    // Create user
    const userRepo = dataSource.getRepository(User);
    const user = userRepo.create({
      email: 'user@test.com',
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      organizationId: orgId,
    });
    const savedUser = await userRepo.save(user);
    userId = savedUser.id;

    // Create UserOrganization
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.save({
      userId: savedUser.id,
      organizationId: orgId,
      role: 'admin',
      isActive: true,
    });

    // Create workspace with slug
    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace = workspaceRepo.create({
      name: 'Test Workspace',
      slug: workspaceSlug,
      organizationId: orgId,
      createdBy: userId,
      ownerId: userId,
    });
    const savedWorkspace = await workspaceRepo.save(workspace);
    workspaceId = savedWorkspace.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@test.com',
        password: 'hashed-password',
      });
    userToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    const workspaceRepo = dataSource.getRepository(Workspace);
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await workspaceRepo.delete({});
    await userOrgRepo.delete({});
    await userRepo.delete({});
    await orgRepo.delete({});

    await app.close();
  });

  it('should resolve workspace by slug', async () => {
    const response = await request(app.getHttpServer())
      .get(`/workspaces/resolve/${workspaceSlug}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('workspaceId', workspaceId);
  });

  it('should return 404 for non-existent slug', async () => {
    const response = await request(app.getHttpServer())
      .get('/workspaces/resolve/non-existent-slug')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('code', 'WORKSPACE_NOT_FOUND');
  });
});
