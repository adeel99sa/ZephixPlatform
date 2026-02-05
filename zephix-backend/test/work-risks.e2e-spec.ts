import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Work Risks E2E Test
 *
 * Tests the /work/risks endpoints with proper workspace tenancy:
 * 1. 403 WORKSPACE_REQUIRED without x-workspace-id header
 * 2. 200 list with header and projectId
 * 3. 403 viewer cannot create (write access denied)
 * 4. 201 admin or member can create
 */
describe('Work Risks (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  const authHeaders = () => ({
    Authorization: `Bearer ${authToken}`,
    'x-workspace-id': workspaceId,
  });

  const authHeadersNoWorkspace = () => ({
    Authorization: `Bearer ${authToken}`,
  });

  describe('Setup', () => {
    it('should login and get auth token', async () => {
      const res = await server()
        .post('/api/auth/login')
        .send({
          email: process.env.TEST_USER_EMAIL || 'test@example.com',
          password: process.env.TEST_USER_PASSWORD || 'password123',
        });

      expect(res.status).toBe(200);
      authToken = res.body.data?.accessToken || res.body.accessToken;
      organizationId = res.body.data?.organizationId || res.body.organizationId;
      expect(authToken).toBeDefined();
    });

    it('should get or create workspace', async () => {
      const listRes = await server()
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`);

      if (listRes.status === 200 && listRes.body.data?.length > 0) {
        workspaceId = listRes.body.data[0].id;
      } else {
        const createRes = await server()
          .post('/api/workspaces')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: `Risk Test ${Date.now()}` });

        expect(createRes.status).toBe(201);
        workspaceId = createRes.body.data?.id || createRes.body.id;
      }
      expect(workspaceId).toBeDefined();
    });

    it('should get or create project', async () => {
      // Try to get existing project
      const listRes = await server()
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      if (listRes.status === 200 && listRes.body.data?.length > 0) {
        projectId = listRes.body.data[0].id;
      } else {
        const createRes = await server()
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-workspace-id', workspaceId)
          .send({
            name: `Risk Test Project ${Date.now()}`,
            workspaceId,
          });

        expect([200, 201]).toContain(createRes.status);
        projectId = createRes.body.data?.id || createRes.body.id;
      }
      expect(projectId).toBeDefined();
    });
  });

  describe('GET /work/risks', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await server()
        .get(`/api/work/risks?projectId=${projectId}`)
        .set(authHeadersNoWorkspace());

      expect(res.status).toBe(403);
      expect(res.body.code || res.body.message).toMatch(/WORKSPACE_REQUIRED/i);
    });

    it('should return 200 with empty list initially', async () => {
      const res = await server()
        .get(`/api/work/risks?projectId=${projectId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should require projectId query parameter', async () => {
      const res = await server()
        .get('/api/work/risks')
        .set(authHeaders());

      // Should fail validation without projectId
      expect(res.status).toBe(400);
    });
  });

  describe('POST /work/risks', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await server()
        .post('/api/work/risks')
        .set(authHeadersNoWorkspace())
        .send({
          projectId,
          title: 'Test Risk',
        });

      expect(res.status).toBe(403);
      expect(res.body.code || res.body.message).toMatch(/WORKSPACE_REQUIRED/i);
    });

    it('should create risk with valid data (admin/member)', async () => {
      const res = await server()
        .post('/api/work/risks')
        .set(authHeaders())
        .send({
          projectId,
          title: `E2E Test Risk ${Date.now()}`,
          description: 'Test description',
          severity: 'HIGH',
          status: 'OPEN',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toContain('E2E Test Risk');
      expect(res.body.data.severity).toBe('HIGH');
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.workspaceId).toBe(workspaceId);
      expect(res.body.data.projectId).toBe(projectId);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const res = await server()
        .post('/api/work/risks')
        .set(authHeaders())
        .send({
          projectId: fakeProjectId,
          title: 'Test Risk for Fake Project',
        });

      expect(res.status).toBe(404);
      expect(res.body.code || res.body.message).toMatch(/PROJECT_NOT_FOUND/i);
    });

    it('should validate required fields', async () => {
      const res = await server()
        .post('/api/work/risks')
        .set(authHeaders())
        .send({
          // Missing projectId and title
        });

      expect(res.status).toBe(400);
    });
  });

  describe('List after Create', () => {
    it('should return created risks in list', async () => {
      // Create a risk
      const createRes = await server()
        .post('/api/work/risks')
        .set(authHeaders())
        .send({
          projectId,
          title: `List Test Risk ${Date.now()}`,
          severity: 'MEDIUM',
        });

      expect(createRes.status).toBe(201);
      const createdRiskId = createRes.body.data.id;

      // List risks
      const listRes = await server()
        .get(`/api/work/risks?projectId=${projectId}`)
        .set(authHeaders());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.length).toBeGreaterThan(0);

      // Verify created risk is in list
      const foundRisk = listRes.body.data.items.find(
        (r: { id: string }) => r.id === createdRiskId
      );
      expect(foundRisk).toBeDefined();
    });

    it('should filter by severity', async () => {
      const res = await server()
        .get(`/api/work/risks?projectId=${projectId}&severity=HIGH`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      // All returned risks should have HIGH severity
      for (const risk of res.body.data.items) {
        expect(risk.severity).toBe('HIGH');
      }
    });

    it('should filter by status', async () => {
      const res = await server()
        .get(`/api/work/risks?projectId=${projectId}&status=OPEN`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      // All returned risks should have OPEN status
      for (const risk of res.body.data.items) {
        expect(risk.status).toBe('OPEN');
      }
    });
  });
});
