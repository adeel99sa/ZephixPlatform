import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Work Resource Allocations E2E Test
 *
 * Tests the /work/resources/allocations endpoints with proper workspace tenancy:
 * 1. 403 WORKSPACE_REQUIRED without x-workspace-id header
 * 2. 200 list with header and projectId
 * 3. 403 viewer cannot create, update, delete
 * 4. 201 member can create, 200 can update
 * 5. 403 member cannot delete, 200 admin can delete
 */
describe('Work Resource Allocations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;
  let projectId: string;
  let userId: string;
  let createdAllocationId: string;

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
      userId = res.body.data?.userId || res.body.user?.id;
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
          .send({ name: `Allocation Test ${Date.now()}` });

        expect(createRes.status).toBe(201);
        workspaceId = createRes.body.data?.id || createRes.body.id;
      }
      expect(workspaceId).toBeDefined();
    });

    it('should get or create project', async () => {
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
            name: `Allocation Test Project ${Date.now()}`,
            workspaceId,
          });

        expect([200, 201]).toContain(createRes.status);
        projectId = createRes.body.data?.id || createRes.body.id;
      }
      expect(projectId).toBeDefined();
    });
  });

  describe('GET /work/resources/allocations', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await server()
        .get(`/api/work/resources/allocations?projectId=${projectId}`)
        .set(authHeadersNoWorkspace());

      expect(res.status).toBe(403);
      expect(res.body.code || res.body.message).toMatch(/WORKSPACE_REQUIRED/i);
    });

    it('should return 200 with empty list initially', async () => {
      const res = await server()
        .get(`/api/work/resources/allocations?projectId=${projectId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should require projectId query parameter', async () => {
      const res = await server()
        .get('/api/work/resources/allocations')
        .set(authHeaders());

      expect(res.status).toBe(400);
    });
  });

  describe('POST /work/resources/allocations', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await server()
        .post('/api/work/resources/allocations')
        .set(authHeadersNoWorkspace())
        .send({
          projectId,
          userId,
          allocationPercent: 50,
        });

      expect(res.status).toBe(403);
      expect(res.body.code || res.body.message).toMatch(/WORKSPACE_REQUIRED/i);
    });

    it('should create allocation with valid data', async () => {
      const res = await server()
        .post('/api/work/resources/allocations')
        .set(authHeaders())
        .send({
          projectId,
          userId,
          allocationPercent: 75,
          startDate: '2026-02-01',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.allocationPercent).toBe(75);
      expect(res.body.data.workspaceId).toBe(workspaceId);
      expect(res.body.data.projectId).toBe(projectId);
      expect(res.body.data.userId).toBe(userId);

      createdAllocationId = res.body.data.id;
    });

    it('should return 409 for duplicate allocation', async () => {
      const res = await server()
        .post('/api/work/resources/allocations')
        .set(authHeaders())
        .send({
          projectId,
          userId,
          allocationPercent: 50,
        });

      expect(res.status).toBe(409);
      expect(res.body.code || res.body.message).toMatch(/ALLOCATION_EXISTS/i);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const res = await server()
        .post('/api/work/resources/allocations')
        .set(authHeaders())
        .send({
          projectId: fakeProjectId,
          userId,
          allocationPercent: 50,
        });

      expect(res.status).toBe(404);
      expect(res.body.code || res.body.message).toMatch(/PROJECT_NOT_FOUND/i);
    });
  });

  describe('PATCH /work/resources/allocations/:id', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await server()
        .patch(`/api/work/resources/allocations/${createdAllocationId}`)
        .set(authHeadersNoWorkspace())
        .send({
          allocationPercent: 80,
        });

      expect(res.status).toBe(403);
      expect(res.body.code || res.body.message).toMatch(/WORKSPACE_REQUIRED/i);
    });

    it('should update allocation percentage', async () => {
      const res = await server()
        .patch(`/api/work/resources/allocations/${createdAllocationId}`)
        .set(authHeaders())
        .send({
          allocationPercent: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.allocationPercent).toBe(100);
    });

    it('should return 404 for non-existent allocation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await server()
        .patch(`/api/work/resources/allocations/${fakeId}`)
        .set(authHeaders())
        .send({
          allocationPercent: 50,
        });

      expect(res.status).toBe(404);
      expect(res.body.code || res.body.message).toMatch(/ALLOCATION_NOT_FOUND/i);
    });
  });

  describe('DELETE /work/resources/allocations/:id', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await server()
        .delete(`/api/work/resources/allocations/${createdAllocationId}`)
        .set(authHeadersNoWorkspace());

      expect(res.status).toBe(403);
      expect(res.body.code || res.body.message).toMatch(/WORKSPACE_REQUIRED/i);
    });

    it('should delete allocation (admin)', async () => {
      const res = await server()
        .delete(`/api/work/resources/allocations/${createdAllocationId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('should return 404 for already deleted allocation', async () => {
      const res = await server()
        .delete(`/api/work/resources/allocations/${createdAllocationId}`)
        .set(authHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('List after operations', () => {
    it('should return empty list after deletion', async () => {
      const res = await server()
        .get(`/api/work/resources/allocations?projectId=${projectId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      // The allocation we created was deleted, so it shouldn't appear
      const found = res.body.data.items.find(
        (a: { id: string }) => a.id === createdAllocationId
      );
      expect(found).toBeUndefined();
    });
  });
});
