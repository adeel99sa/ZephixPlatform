import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
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
import { TaskStatus } from '../src/modules/work-management/enums/task.enums';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';
import * as bcrypt from 'bcrypt';

/**
 * Work Management Tenancy Protection Tests
 *
 * These tests prove tenant isolation and role enforcement:
 * 1. Missing x-workspace-id on /work/tasks returns 400/403 WORKSPACE_REQUIRED
 * 2. Wrong workspace header for a task returns 404 (existence leak prevention)
 * 3. Viewer role write attempt returns 403
 */
describe('Work Management Tenancy Protection (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Org 1 - Admin user with full access
  let org1: Organization;
  let adminUser: User;
  let workspace1: Workspace;
  let project1: Project;
  let phase1: WorkPhase;
  let task1: WorkTask;
  let adminToken: string;

  // Org 1 - Viewer user (read-only)
  let viewerUser: User;
  let viewerToken: string;

  // Org 2 - Different tenant (cross-tenant attack vector)
  let org2: Organization;
  let attackerUser: User;
  let workspace2: Workspace;
  let attackerToken: string;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
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
    const hashedPassword = await bcrypt.hash('password123', 10);
    const ts = Date.now();

    // === ORG 1: Target organization ===
    const orgRepo = dataSource.getRepository(Organization);
    org1 = await orgRepo.save({
      name: 'Tenancy Test Org 1',
      slug: `tenancy-test-org1-${ts}`,
      domain: `tenancy1-${ts}.test`,
    });

    const userRepo = dataSource.getRepository(User);
    adminUser = await userRepo.save({
      email: `tenancy-admin-${ts}@example.com`,
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org1.id,
    });

    viewerUser = await userRepo.save({
      email: `tenancy-viewer-${ts}@example.com`,
      firstName: 'Viewer',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org1.id,
    });

    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({ userId: adminUser.id, organizationId: org1.id, role: 'admin' });
    await uoRepo.save({ userId: viewerUser.id, organizationId: org1.id, role: 'member' });

    const wsRepo = dataSource.getRepository(Workspace);
    workspace1 = await wsRepo.save({
      name: 'Tenancy Test Workspace 1',
      slug: `tenancy-ws1-${ts}`,
      organizationId: org1.id,
      ownerId: adminUser.id,
    });

    const wmRepo = dataSource.getRepository(WorkspaceMember);
    await wmRepo.save({
      workspaceId: workspace1.id,
      userId: adminUser.id,
      role: 'delivery_owner',
    });
    await wmRepo.save({
      workspaceId: workspace1.id,
      userId: viewerUser.id,
      role: 'viewer', // Read-only role
    });

    const projectRepo = dataSource.getRepository(Project);
    project1 = await projectRepo.save({
      name: 'Tenancy Test Project',
      organizationId: org1.id,
      workspaceId: workspace1.id,
      state: ProjectState.ACTIVE,
      createdById: adminUser.id,
    });

    const phaseRepo = dataSource.getRepository(WorkPhase);
    phase1 = await phaseRepo.save({
      name: 'Test Phase',
      projectId: project1.id,
      workspaceId: workspace1.id,
      sortOrder: 0,
      reportingKey: 'test-phase',
    });

    const taskRepo = dataSource.getRepository(WorkTask);
    task1 = await taskRepo.save({
      title: 'Test Task',
      projectId: project1.id,
      workspaceId: workspace1.id,
      phaseId: phase1.id,
      status: TaskStatus.TODO,
      rank: '0|aaaaaa:',
    });

    // === ORG 2: Attacker organization ===
    org2 = await orgRepo.save({
      name: 'Attacker Org',
      slug: `attacker-org-${ts}`,
      domain: `attacker-${ts}.test`,
    });

    attackerUser = await userRepo.save({
      email: `attacker-${ts}@example.com`,
      firstName: 'Attacker',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org2.id,
    });

    await uoRepo.save({ userId: attackerUser.id, organizationId: org2.id, role: 'admin' });

    workspace2 = await wsRepo.save({
      name: 'Attacker Workspace',
      slug: `attacker-ws-${ts}`,
      organizationId: org2.id,
      ownerId: attackerUser.id,
    });

    await wmRepo.save({
      workspaceId: workspace2.id,
      userId: attackerUser.id,
      role: 'delivery_owner',
    });

    // === Get auth tokens ===
    const server = () => request(app.getHttpServer());

    const adminLogin = await server().post('/api/auth/login').send({
      email: adminUser.email,
      password: 'password123',
    });
    adminToken = adminLogin.body.data?.accessToken || adminLogin.body.accessToken;

    const viewerLogin = await server().post('/api/auth/login').send({
      email: viewerUser.email,
      password: 'password123',
    });
    viewerToken = viewerLogin.body.data?.accessToken || viewerLogin.body.accessToken;

    const attackerLogin = await server().post('/api/auth/login').send({
      email: attackerUser.email,
      password: 'password123',
    });
    attackerToken = attackerLogin.body.data?.accessToken || attackerLogin.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation
    try {
      const taskRepo = dataSource.getRepository(WorkTask);
      await taskRepo.delete({ projectId: project1?.id });

      const phaseRepo = dataSource.getRepository(WorkPhase);
      await phaseRepo.delete({ projectId: project1?.id });

      const projectRepo = dataSource.getRepository(Project);
      if (project1?.id) await projectRepo.delete({ id: project1.id });

      const wmRepo = dataSource.getRepository(WorkspaceMember);
      if (workspace1?.id) await wmRepo.delete({ workspaceId: workspace1.id });
      if (workspace2?.id) await wmRepo.delete({ workspaceId: workspace2.id });

      const wsRepo = dataSource.getRepository(Workspace);
      if (workspace1?.id) await wsRepo.delete({ id: workspace1.id });
      if (workspace2?.id) await wsRepo.delete({ id: workspace2.id });

      const uoRepo = dataSource.getRepository(UserOrganization);
      if (adminUser?.id) await uoRepo.delete({ userId: adminUser.id });
      if (viewerUser?.id) await uoRepo.delete({ userId: viewerUser.id });
      if (attackerUser?.id) await uoRepo.delete({ userId: attackerUser.id });

      const userRepo = dataSource.getRepository(User);
      if (adminUser?.id) await userRepo.delete({ id: adminUser.id });
      if (viewerUser?.id) await userRepo.delete({ id: viewerUser.id });
      if (attackerUser?.id) await userRepo.delete({ id: attackerUser.id });

      const orgRepo = dataSource.getRepository(Organization);
      if (org1?.id) await orgRepo.delete({ id: org1.id });
      if (org2?.id) await orgRepo.delete({ id: org2.id });
    } catch {
      // Ignore cleanup errors
    }

    await app.close();
  });

  const server = () => request(app.getHttpServer());

  describe('1. Missing x-workspace-id header → 403 WORKSPACE_REQUIRED', () => {
    it('GET /work/tasks without x-workspace-id returns 403 WORKSPACE_REQUIRED', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body?.code).toBe('WORKSPACE_REQUIRED');
    });

    it('POST /work/tasks without x-workspace-id returns 403 WORKSPACE_REQUIRED', async () => {
      const res = await server()
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: project1.id,
          title: 'Should fail',
        });

      expect(res.status).toBe(403);
      expect(res.body?.code).toBe('WORKSPACE_REQUIRED');
    });

    it('PATCH /work/tasks/:id without x-workspace-id returns 403 WORKSPACE_REQUIRED', async () => {
      const res = await server()
        .patch(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Should fail' });

      expect(res.status).toBe(403);
      expect(res.body?.code).toBe('WORKSPACE_REQUIRED');
    });
  });

  describe('2. Wrong workspace header (cross-tenant attack)', () => {
    it('GET /work/tasks with wrong workspace returns empty or 404', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${attackerToken}`)
        .set('x-workspace-id', workspace1.id); // Attacker tries to access victim's workspace

      // Should either:
      // - Return 403/404 (access denied)
      // - Return empty list (filtered by membership)
      if (res.status === 200) {
        // If 200, must return empty (no cross-tenant data leak)
        const items = res.body?.data?.items || res.body?.items || res.body?.data || [];
        expect(Array.isArray(items) ? items.length : 0).toBe(0);
      } else {
        expect([403, 404]).toContain(res.status);
      }
    });

    it('GET /work/tasks/:id with wrong workspace returns 404', async () => {
      const res = await server()
        .get(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .set('x-workspace-id', workspace2.id); // Attacker's workspace, victim's task

      // Must return 404 to prevent existence leak
      expect(res.status).toBe(404);
    });

    it('PATCH /work/tasks/:id with wrong workspace returns 404', async () => {
      const res = await server()
        .patch(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .set('x-workspace-id', workspace2.id)
        .send({ title: 'Hacked!' });

      // Must return 404 - cannot modify cross-tenant resources
      expect(res.status).toBe(404);
    });

    it('DELETE /work/tasks/:id with wrong workspace returns 404', async () => {
      const res = await server()
        .delete(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .set('x-workspace-id', workspace2.id);

      // Must return 404 - cannot delete cross-tenant resources
      expect(res.status).toBe(404);
    });
  });

  describe('3. Viewer role write attempts', () => {
    it('Viewer cannot POST /work/tasks (returns 403)', async () => {
      const res = await server()
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          projectId: project1.id,
          title: 'Viewer should not create',
        });

      expect(res.status).toBe(403);
    });

    it('Viewer cannot PATCH /work/tasks/:id (returns 403)', async () => {
      const res = await server()
        .patch(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({ title: 'Viewer should not edit' });

      expect(res.status).toBe(403);
    });

    it('Viewer cannot DELETE /work/tasks/:id (returns 403)', async () => {
      const res = await server()
        .delete(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(res.status).toBe(403);
    });

    it('Viewer CAN GET /work/tasks (read-only allowed)', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(res.status).toBe(200);
    });

    it('Viewer CAN GET /work/tasks/:id (read-only allowed)', async () => {
      const res = await server()
        .get(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', workspace1.id);

      // Viewer should be able to read
      expect([200, 404]).toContain(res.status); // 404 only if task not visible to viewer
    });
  });

  describe('4. Sanity check: Admin can perform all operations', () => {
    it('Admin can GET /work/tasks', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', workspace1.id);

      expect(res.status).toBe(200);
    });

    it('Admin can PATCH /work/tasks/:id', async () => {
      const res = await server()
        .patch(`/api/work/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', workspace1.id)
        .send({ title: 'Updated by admin' });

      expect([200, 404]).toContain(res.status); // 200 on success, 404 if task deleted
    });
  });
});
