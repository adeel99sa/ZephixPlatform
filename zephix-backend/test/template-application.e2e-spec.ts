import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { ProjectTemplate } from '../src/modules/templates/entities/project-template.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { Task } from '../src/modules/projects/entities/task.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Template Application (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let adminUser: User;
  let workspace1: Workspace;
  let template1: ProjectTemplate;

  let adminToken: string;

  beforeAll(async () => {
    // Disable demo bootstrap during tests
    process.env.DEMO_BOOTSTRAP = 'false';

    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set. Tests require Railway database connection.');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));

    app.setGlobalPrefix('api');

    await app.init();

    dataSource = app.get(DataSource);

    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organization
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Template Test Org ${timestamp}`);

    // Create test user
    const testEmailSuffix = `-${timestamp}@template-test.com`;
    adminUser = await createTestUser(`admin${testEmailSuffix}`, 'Admin', 'User', org1.id, 'admin');

    // Create UserOrganization entry
    await createUserOrganization(adminUser.id, org1.id, 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace('Template Test Workspace', org1.id, adminUser.id);

    // Create test template with phases and tasks
    template1 = await createTestTemplate(
      'Test Template',
      org1.id,
      adminUser.id,
      [
        {
          name: 'Phase 1',
          description: 'First phase',
          order: 1,
          estimatedDurationDays: 5,
        },
        {
          name: 'Phase 2',
          description: 'Second phase',
          order: 2,
          estimatedDurationDays: 10,
        },
      ],
      [
        {
          name: 'Task 1',
          description: 'First task',
          estimatedHours: 8,
          phaseOrder: 1,
          priority: 'high',
        },
        {
          name: 'Task 2',
          description: 'Second task',
          estimatedHours: 16,
          phaseOrder: 2,
          priority: 'medium',
        },
      ],
    );

    // Get auth token
    adminToken = await getAuthToken(adminUser.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Happy Path - Template Application', () => {
    it('Should create project with tasks from template', async () => {
      const timestamp = Date.now();
      const projectName = `Template Project ${timestamp}`;

      const response = await request(app.getHttpServer())
        .post(`/api/admin/templates/${template1.id}/apply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: projectName,
          workspaceId: workspace1.id,
          description: 'Project created from template',
        });

      if (response.status !== 201) {
        console.error('Response status:', response.status);
        console.error('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(projectName);
      expect(response.body.workspaceId).toBe(workspace1.id);
      expect(response.body.organizationId).toBe(org1.id);

      // Verify project exists in database
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({
        where: { id: response.body.id },
      });
      expect(project).toBeDefined();
      expect(project?.name).toBe(projectName);

      // Verify tasks were created
      const taskRepo = dataSource.getRepository(Task);
      const tasks = await taskRepo.find({
        where: { projectId: response.body.id },
      });
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.length).toBe(2); // Should match template taskTemplates count

      // Verify task details
      const task1 = tasks.find(t => t.title === 'Task 1');
      expect(task1).toBeDefined();
      expect(task1?.estimatedHours).toBe(8);
      expect(task1?.priority).toBe('high');

      const task2 = tasks.find(t => t.title === 'Task 2');
      expect(task2).toBeDefined();
      expect(task2?.estimatedHours).toBe(16);
      expect(task2?.priority).toBe('medium');
    });
  });

  describe('Admin CRUD API', () => {
    it('Should list templates (GET /admin/templates)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Should include our test template
      const foundTemplate = response.body.find((t: any) => t.id === template1.id);
      expect(foundTemplate).toBeDefined();
      expect(foundTemplate.isActive).toBe(true);
    });

    it('Should create template (POST /admin/templates)', async () => {
      const timestamp = Date.now();
      const newTemplate = {
        name: `New Test Template ${timestamp}`,
        description: 'A test template created via API',
        methodology: 'agile',
        phases: [
          {
            name: 'Phase 1',
            description: 'First phase',
            order: 0,
            estimatedDurationDays: 5,
          },
        ],
        taskTemplates: [
          {
            name: 'Task 1',
            description: 'First task',
            estimatedHours: 8,
            phaseOrder: 0,
            priority: 'high',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTemplate);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(newTemplate.name);
      expect(response.body.description).toBe(newTemplate.description);
      expect(response.body.methodology).toBe('agile');
    });

    it('Should update template (PATCH /admin/templates/:id)', async () => {
      const updatedName = `Updated Template ${Date.now()}`;
      const updatedDescription = 'Updated description';

      const response = await request(app.getHttpServer())
        .patch(`/api/admin/templates/${template1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: updatedName,
          description: updatedDescription,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updatedName);
      expect(response.body.description).toBe(updatedDescription);

      // Verify change persists
      const getResponse = await request(app.getHttpServer())
        .get(`/api/admin/templates/${template1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe(updatedName);
      expect(getResponse.body.description).toBe(updatedDescription);
    });

    it('Should archive template (DELETE /admin/templates/:id)', async () => {
      // Create a template to archive
      const timestamp = Date.now();
      const templateToArchive = await createTestTemplate(
        `Archive Test Template ${timestamp}`,
        org1.id,
        adminUser.id,
        [],
        [],
      );

      // Archive it
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/admin/templates/${templateToArchive.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify it no longer appears in default list
      const listResponse = await request(app.getHttpServer())
        .get('/api/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listResponse.status).toBe(200);
      const found = listResponse.body.find((t: any) => t.id === templateToArchive.id);
      expect(found).toBeUndefined();

      // Verify isActive is false in database
      const templateRepo = dataSource.getRepository(ProjectTemplate);
      const archived = await templateRepo.findOne({
        where: { id: templateToArchive.id },
      });
      expect(archived).toBeDefined();
      expect(archived?.isActive).toBe(false);
    });
  });

  describe('Template Application Edge Cases', () => {
    it('Should return 404 for non-existent template', async () => {
      const invalidTemplateId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .post(`/api/admin/templates/${invalidTemplateId}/apply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Project',
          workspaceId: workspace1.id,
        });

      expect(response.status).toBe(404);
    });

    it('Should enforce cross-organization isolation', async () => {
      // Create a second organization and template
      const timestamp = Date.now();
      const org2 = await createTestOrganization(`Org 2 ${timestamp}`);
      const template2 = await createTestTemplate(
        'Org 2 Template',
        org2.id,
        adminUser.id,
        [],
        [],
      );

      // Try to apply org2 template from org1 admin context
      const response = await request(app.getHttpServer())
        .post(`/api/admin/templates/${template2.id}/apply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cross Org Test',
          workspaceId: workspace1.id,
        });

      // Should fail with 403 or 404
      expect([403, 404]).toContain(response.status);

      // Verify no project was created
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({
        where: { name: 'Cross Org Test' },
      });
      expect(project).toBeNull();
    });
  });

  describe('Rollback Tests', () => {
    it('Should rollback if workspace does not belong to organization', async () => {
      const timestamp = Date.now();
      const projectName = `Rollback Test Project ${timestamp}`;

      // Create a workspace in a different organization
      const org2 = await createTestOrganization(`Other Org ${timestamp}`);
      const workspace2 = await createTestWorkspace('Other Workspace', org2.id, adminUser.id);

      const response = await request(app.getHttpServer())
        .post(`/api/admin/templates/${template1.id}/apply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: projectName,
          workspaceId: workspace2.id,
        });

      // Should fail with 403 or 404
      expect([403, 404]).toContain(response.status);

      // Verify NO project exists with this name
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({
        where: { name: projectName },
      });
      expect(project).toBeNull();

      // Verify NO tasks exist for this would-be project
      const taskRepo = dataSource.getRepository(Task);
      const allTasks = await taskRepo.find();
      const orphanedTasks = allTasks.filter(t => t.title?.includes('Rollback Test'));
      expect(orphanedTasks.length).toBe(0);
    });

    it('Should rollback if template does not exist', async () => {
      const timestamp = Date.now();
      const projectName = `Invalid Template Project ${timestamp}`;
      const invalidTemplateId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .post(`/api/admin/templates/${invalidTemplateId}/apply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: projectName,
          workspaceId: workspace1.id,
        });

      // Should fail with 404
      expect(response.status).toBe(404);

      // Verify NO project exists
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({
        where: { name: projectName },
      });
      expect(project).toBeNull();
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      if (!dataSource || !dataSource.isInitialized) {
        return;
      }

      try {
        await dataSource.getRepository(Task).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Project).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(ProjectTemplate).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Workspace).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(UserOrganization).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(User).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Organization).delete({});
      } catch (e) { /* table might not exist */ }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    const uniqueSlug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const existing = await orgRepo.findOne({ where: { slug: uniqueSlug } });
    if (existing) {
      return existing;
    }

    const org = orgRepo.create({
      name,
      slug: uniqueSlug,
    });
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
    ownerId: string,
  ): Promise<Workspace> {
    const wsRepo = dataSource.getRepository(Workspace);
    const workspace = wsRepo.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      organizationId,
      createdBy: ownerId,
      ownerId,
      isPrivate: false,
    });
    return wsRepo.save(workspace);
  }

  async function createTestTemplate(
    name: string,
    organizationId: string,
    createdById: string,
    phases: Array<{
      name: string;
      description: string;
      order: number;
      estimatedDurationDays: number;
    }>,
    taskTemplates: Array<{
      name: string;
      description: string;
      estimatedHours: number;
      phaseOrder: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }>,
  ): Promise<ProjectTemplate> {
    const templateRepo = dataSource.getRepository(ProjectTemplate);
    const template = templateRepo.create({
      name,
      description: `Test template: ${name}`,
      methodology: 'agile',
      organizationId,
      createdById,
      phases,
      taskTemplates,
      scope: 'organization',
      isSystem: false,
      isDefault: false,
    });
    const saved = await templateRepo.save(template);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200 or 201, got ${res.status}`);
        }
      });

    return response.body.accessToken || response.body.token;
  }
});

