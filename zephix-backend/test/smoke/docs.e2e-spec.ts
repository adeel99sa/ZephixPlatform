import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { loginAndGetToken, authHeader } from '../utils/e2e-auth';

describe('Docs Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let workspaceId: string;
  let createdDocId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    accessToken = await loginAndGetToken(app, 'demo@zephix.ai', 'demo123456');

    // Get first workspace
    const workspacesResponse = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set(authHeader(accessToken))
      .expect(200);

    if (workspacesResponse.body.data.length === 0) {
      throw new Error('No workspaces found for test user');
    }

    workspaceId = workspacesResponse.body.data[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a doc and retrieve it', async () => {
    // Create doc
    const createResponse = await request(app.getHttpServer())
      .post(`/api/workspaces/${workspaceId}/docs`)
      .set(authHeader(accessToken))
      .set('x-workspace-id', workspaceId)
      .send({
        title: 'Smoke Doc tenant-repo',
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('data');
    expect(createResponse.body.data).toHaveProperty('docId');
    createdDocId = createResponse.body.data.docId;

    // Get the created doc
    const getResponse = await request(app.getHttpServer())
      .get(`/api/workspaces/${workspaceId}/docs/${createdDocId}`)
      .set(authHeader(accessToken))
      .set('x-workspace-id', workspaceId)
      .expect(200);

    expect(getResponse.body).toHaveProperty('data');
    const doc = getResponse.body.data;
    expect(doc).toHaveProperty('id');
    expect(doc.id).toBe(createdDocId);
    expect(doc).toHaveProperty('workspaceId');
    expect(doc.workspaceId).toBe(workspaceId);
    expect(doc).toHaveProperty('title');
    expect(doc.title).toBe('Smoke Doc tenant-repo');
  });
});
