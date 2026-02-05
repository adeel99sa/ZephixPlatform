import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** Placeholder IDs; guard returns 410 before any DB access for writes. */
const PLACEHOLDER_PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const PLACEHOLDER_TASK_ID = '00000000-0000-4000-8000-000000000002';
const PLACEHOLDER_DEP_ID = '00000000-0000-4000-8000-000000000003';

/**
 * Write operations (POST, PUT, PATCH, DELETE) on legacy routes return 410.
 * GET operations are allowed for backward compatibility (they pass guard, then fail on JWT).
 */
function expect410Write(res: request.Response) {
  expect(res.status).toBe(410);
  expect(res.body?.code).toBe('LEGACY_ENDPOINT_DISABLED');
  expect(res.body?.message).toMatch(/legacy|disabled|use.*work\/tasks/i);
}

/**
 * GET requests pass the LegacyTasksGuard (allowed for read-only backward compat)
 * but then fail on JwtAuthGuard (401) since no auth token is provided.
 */
function expectGetPassesGuardButFailsAuth(res: request.Response) {
  // GET passes legacy guard, fails on JWT (401)
  expect(res.status).toBe(401);
}

/**
 * Legacy task routes behavior:
 * - GET requests: pass guard (allowed for backward compat), fail on JWT (401)
 * - Write requests (POST, PUT, PATCH, DELETE): return 410 LEGACY_ENDPOINT_DISABLED
 */
describe('Legacy task routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  describe('/api/tasks (Legacy TasksController)', () => {
    it('POST /api/tasks returns 410 (write blocked)', async () => {
      const res = await server().post('/api/tasks').send({ title: 'x', projectId: PLACEHOLDER_PROJECT_ID });
      expect410Write(res);
    });

    it('GET /api/tasks/my-tasks passes guard, fails JWT (401)', async () => {
      const res = await server().get('/api/tasks/my-tasks');
      expectGetPassesGuardButFailsAuth(res);
    });

    it('GET /api/tasks/project/:projectId passes guard, fails JWT (401)', async () => {
      const res = await server().get(`/api/tasks/project/${PLACEHOLDER_PROJECT_ID}`);
      expectGetPassesGuardButFailsAuth(res);
    });

    it('GET /api/tasks/:id passes guard, fails JWT (401)', async () => {
      const res = await server().get(`/api/tasks/${PLACEHOLDER_TASK_ID}`);
      expectGetPassesGuardButFailsAuth(res);
    });

    it('PATCH /api/tasks/:id returns 410 (write blocked)', async () => {
      const res = await server().patch(`/api/tasks/${PLACEHOLDER_TASK_ID}`).send({ status: 'TODO' });
      expect410Write(res);
    });

    it('DELETE /api/tasks/:id returns 410 (write blocked)', async () => {
      const res = await server().delete(`/api/tasks/${PLACEHOLDER_TASK_ID}`);
      expect410Write(res);
    });

    it('PATCH /api/tasks/:id/progress returns 410 (write blocked)', async () => {
      const res = await server().patch(`/api/tasks/${PLACEHOLDER_TASK_ID}/progress`).send({ progress: 50 });
      expect410Write(res);
    });

    it('POST /api/tasks/:id/dependencies returns 410 (write blocked)', async () => {
      const res = await server()
        .post(`/api/tasks/${PLACEHOLDER_TASK_ID}/dependencies`)
        .send({ predecessorId: PLACEHOLDER_DEP_ID });
      expect410Write(res);
    });

    it('DELETE /api/tasks/:id/dependencies/:depId returns 410 (write blocked)', async () => {
      const res = await server().delete(
        `/api/tasks/${PLACEHOLDER_TASK_ID}/dependencies/${PLACEHOLDER_DEP_ID}`,
      );
      expect410Write(res);
    });

    it('GET /api/tasks/:id/dependencies passes guard, fails JWT (401)', async () => {
      const res = await server().get(`/api/tasks/${PLACEHOLDER_TASK_ID}/dependencies`);
      expectGetPassesGuardButFailsAuth(res);
    });
  });

  describe('/api/projects/:projectId/tasks (Legacy Project TaskController)', () => {
    it('POST /api/projects/:projectId/tasks returns 410 (write blocked)', async () => {
      const res = await server()
        .post(`/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks`)
        .send({ title: 'x' });
      expect410Write(res);
    });

    it('GET /api/projects/:projectId/tasks passes guard, fails JWT (401)', async () => {
      const res = await server().get(`/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks`);
      expectGetPassesGuardButFailsAuth(res);
    });

    it('GET /api/projects/:projectId/tasks?phaseId= passes guard, fails JWT (401)', async () => {
      const res = await server().get(
        `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks?phaseId=${PLACEHOLDER_TASK_ID}`,
      );
      expectGetPassesGuardButFailsAuth(res);
    });

    it('GET /api/projects/:projectId/tasks/:id passes guard, fails JWT (401)', async () => {
      const res = await server().get(
        `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`,
      );
      expectGetPassesGuardButFailsAuth(res);
    });

    it('PUT /api/projects/:projectId/tasks/:id returns 410 (write blocked)', async () => {
      const res = await server()
        .put(`/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`)
        .send({ title: 'y' });
      expect410Write(res);
    });

    it('PATCH /api/projects/:projectId/tasks/:taskId returns 410 (write blocked)', async () => {
      const res = await server()
        .patch(`/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`)
        .send({ status: 'IN_PROGRESS' });
      expect410Write(res);
    });

    it('PUT /api/projects/:projectId/tasks/:id/progress returns 410 (write blocked)', async () => {
      const res = await server()
        .put(`/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}/progress`)
        .send({ progress: 50 });
      expect410Write(res);
    });

    it('DELETE /api/projects/:projectId/tasks/:id returns 410 (write blocked)', async () => {
      const res = await server().delete(
        `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`,
      );
      expect410Write(res);
    });
  });

  /** Kill switch: canonical list of legacy write routes. All return 410. */
  it('every legacy write route returns 410 (contract snapshot)', async () => {
    const legacyWriteRoutes: { method: string; path: string; body?: object }[] = [
      { method: 'POST', path: '/api/tasks', body: { title: 'x', projectId: PLACEHOLDER_PROJECT_ID } },
      { method: 'PATCH', path: `/api/tasks/${PLACEHOLDER_TASK_ID}`, body: { status: 'TODO' } },
      { method: 'DELETE', path: `/api/tasks/${PLACEHOLDER_TASK_ID}` },
      { method: 'PATCH', path: `/api/tasks/${PLACEHOLDER_TASK_ID}/progress`, body: { progress: 50 } },
      { method: 'POST', path: `/api/tasks/${PLACEHOLDER_TASK_ID}/dependencies`, body: { predecessorId: PLACEHOLDER_DEP_ID } },
      { method: 'DELETE', path: `/api/tasks/${PLACEHOLDER_TASK_ID}/dependencies/${PLACEHOLDER_DEP_ID}` },
      { method: 'POST', path: `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks`, body: { title: 'x' } },
      { method: 'PUT', path: `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`, body: { title: 'y' } },
      { method: 'PATCH', path: `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`, body: { status: 'IN_PROGRESS' } },
      { method: 'PUT', path: `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}/progress`, body: { progress: 50 } },
      { method: 'DELETE', path: `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}` },
    ];

    for (const { method, path, body } of legacyWriteRoutes) {
      let res: request.Response;
      const s = server();
      switch (method) {
        case 'POST':
          res = await s.post(path).send(body ?? {});
          break;
        case 'PATCH':
          res = await s.patch(path).send(body ?? {});
          break;
        case 'PUT':
          res = await s.put(path).send(body ?? {});
          break;
        case 'DELETE':
          res = await s.delete(path);
          break;
        default:
          throw new Error(`Unsupported write method: ${method}`);
      }
      expect(res.status).toBe(410);
      expect(res.body?.code).toBe('LEGACY_ENDPOINT_DISABLED');
    }
  });

  /** GET routes pass guard, fail on JWT (allowed for backward compat read-only). */
  it('every legacy GET route passes guard but fails JWT (401)', async () => {
    const legacyGetRoutes: string[] = [
      '/api/tasks/my-tasks',
      `/api/tasks/project/${PLACEHOLDER_PROJECT_ID}`,
      `/api/tasks/${PLACEHOLDER_TASK_ID}`,
      `/api/tasks/${PLACEHOLDER_TASK_ID}/dependencies`,
      `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks`,
      `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks?phaseId=${PLACEHOLDER_TASK_ID}`,
      `/api/projects/${PLACEHOLDER_PROJECT_ID}/tasks/${PLACEHOLDER_TASK_ID}`,
    ];

    for (const path of legacyGetRoutes) {
      const res = await server().get(path);
      expect(res.status).toBe(401);
    }
  });
});
