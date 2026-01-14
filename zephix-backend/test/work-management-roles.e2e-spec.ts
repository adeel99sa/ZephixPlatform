import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Project, ProjectState } from '../src/modules/projects/entities/project.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { WorkPhase } from '../src/modules/work-management/entities/work-phase.entity';
import { WorkTask } from '../src/modules/work-management/entities/work-task.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';

describe('Work Management Roles (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org1: Organization;
  let adminUser1: User;
  let stakeholderUser: User;
  let deliveryOwnerUser: User;
  let workspace1: Workspace;
  let project1: Project;
  let adminToken1: string;
  let stakeholderToken: string;
  let deliveryOwnerToken: string;

  beforeAll(async () => {
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
    app.useGlobalFilters(new ApiErrorFilter());
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    org1 = await orgRepo.save({
      name: 'Roles Test Org',
      slug: 'roles-test-org-' + Date.now(),
      domain: 'rolestest.com',
    });

    // Create test users
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser1 = await userRepo.save({
      email: `roles-admin-${Date.now()}@example.com`,
      firstName: 'Admin',
      lastName: 'Test',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org1.id,
    });

    stakeholderUser = await userRepo.save({
      email: `roles-stakeholder-${Date.now()}@example.com`,
      firstName: 'Stakeholder',
      lastName: 'Test',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org1.id,
    });

    deliveryOwnerUser = await userRepo.save({
      email: `roles-delivery-${Date.now()}@example.com`,
      firstName: 'Delivery',
      lastName: 'Owner',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org1.id,
    });

    // Create user-organization links
    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({
      userId: adminUser1.id,
      organizationId: org1.id,
      role: 'admin',
    });
    await uoRepo.save({
      userId: stakeholderUser.id,
      organizationId: org1.id,
      role: 'member',
    });
    await uoRepo.save({
      userId: deliveryOwnerUser.id,
      organizationId: org1.id,
      role: 'member',
    });

    // Login to get tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminUser1.email,
        password: 'password123',
      });
    adminToken1 = adminLogin.body.accessToken || adminLogin.body.data?.accessToken;

    const stakeholderLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: stakeholderUser.email,
        password: 'password123',
      });
    stakeholderToken = stakeholderLogin.body.accessToken || stakeholderLogin.body.data?.accessToken;

    const deliveryLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: deliveryOwnerUser.email,
        password: 'password123',
      });
    deliveryOwnerToken = deliveryLogin.body.accessToken || deliveryLogin.body.data?.accessToken;

    // Create workspace
    const workspaceRepo = dataSource.getRepository(Workspace);
    workspace1 = await workspaceRepo.save({
      name: 'Roles Test Workspace',
      organizationId: org1.id,
      createdBy: adminUser1.id,
      isPrivate: false,
    });

    // Create workspace memberships
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save({
      workspaceId: workspace1.id,
      userId: adminUser1.id,
      role: 'workspace_owner',
    });
    await memberRepo.save({
      workspaceId: workspace1.id,
      userId: stakeholderUser.id,
      role: 'stakeholder',
    });
    await memberRepo.save({
      workspaceId: workspace1.id,
      userId: deliveryOwnerUser.id,
      role: 'delivery_owner',
    });

    // Create project
    const projectRepo = dataSource.getRepository(Project);
    project1 = await projectRepo.save({
      name: 'Roles Test Project',
      organizationId: org1.id,
      workspaceId: workspace1.id,
      state: ProjectState.DRAFT,
      structureLocked: false,
      deliveryOwnerUserId: null, // Will be set in test D
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('A. Stakeholder cannot write', () => {
    it('should block stakeholder from instantiating template', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/templates/${uuidv4()}/instantiate-v5_1`)
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({ projectName: 'Test Project' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('should block stakeholder from starting project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/work/projects/${project1.id}/start`)
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('should block stakeholder from creating task', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          projectId: project1.id,
          title: 'Test Task',
          status: 'TODO',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('should block stakeholder from updating phase', async () => {
      // Create a phase first
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org1.id,
        workspaceId: workspace1.id,
        projectId: project1.id,
        name: 'Test Phase',
        sortOrder: 1,
        isMilestone: false,
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/work/phases/${phase.id}`)
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({ name: 'Updated Phase' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('B. Stakeholder can read', () => {
    it('should allow stakeholder to get recommendations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/templates/recommendations')
        .query({ containerType: 'PROJECT', workType: 'MIGRATION' })
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should allow stakeholder to get preview', async () => {
      // Create a template first (simplified - in real test would seed templates)
      const response = await request(app.getHttpServer())
        .get(`/api/templates/${uuidv4()}/preview-v5_1`)
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id);

      // May be 404 if template doesn't exist, but should not be 403
      expect(response.status).not.toBe(403);
    });

    it('should allow stakeholder to get project overview', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${project1.id}/overview`)
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should allow stakeholder to get project plan', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${project1.id}/plan`)
        .set('Authorization', `Bearer ${stakeholderToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('C. Delivery owner can write', () => {
    it('should allow delivery owner to create task', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${deliveryOwnerToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          projectId: project1.id,
          title: 'Delivery Owner Task',
          status: 'TODO',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
    });

    it('should allow delivery owner to update task', async () => {
      // Create task first
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = await taskRepo.save({
        organizationId: org1.id,
        workspaceId: workspace1.id,
        projectId: project1.id,
        title: 'Test Task',
        status: 'TODO',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/work/tasks/${task.id}`)
        .set('Authorization', `Bearer ${deliveryOwnerToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should allow delivery owner to update phase', async () => {
      // Create a phase first
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org1.id,
        workspaceId: workspace1.id,
        projectId: project1.id,
        name: 'Test Phase',
        sortOrder: 1,
        isMilestone: false,
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/work/phases/${phase.id}`)
        .set('Authorization', `Bearer ${deliveryOwnerToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({ name: 'Updated Phase' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('D. Start requires delivery owner set', () => {
    it('should return 409 DELIVERY_OWNER_REQUIRED when starting project without delivery owner', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/work/projects/${project1.id}/start`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('DELIVERY_OWNER_REQUIRED');
    });

    it('should allow workspace_owner to set delivery owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/work/projects/${project1.id}/delivery-owner`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({ userId: deliveryOwnerUser.id });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.deliveryOwnerUserId).toBe(deliveryOwnerUser.id);
    });

    it('should allow start after delivery owner is set', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/work/projects/${project1.id}/start`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.state).toBe('ACTIVE');
    });
  });
});

