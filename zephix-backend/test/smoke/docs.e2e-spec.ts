import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { authHeader } from '../utils/e2e-auth';
import { seedWorkspaceMvp } from '../utils/e2e-seed';

describe('Docs Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let seeded: Awaited<ReturnType<typeof seedWorkspaceMvp>>;
  let createdDocId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Seed test data
    seeded = await seedWorkspaceMvp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a doc and retrieve it', async () => {
    // Create doc
    const createResponse = await request(app.getHttpServer())
      .post(`/api/workspaces/${seeded.workspaceId}/docs`)
      .set(authHeader(seeded.token))
      .set('x-workspace-id', seeded.workspaceId)
      .send({
        title: 'Smoke Doc tenant-repo',
      })
      .expect(201);

    expect(createResponse.body).toHaveProperty('data');
    expect(createResponse.body.data).toHaveProperty('docId');
    createdDocId = createResponse.body.data.docId;

    // Get the created doc
    const getResponse = await request(app.getHttpServer())
      .get(`/api/workspaces/${seeded.workspaceId}/docs/${createdDocId}`)
      .set(authHeader(seeded.token))
      .set('x-workspace-id', seeded.workspaceId)
      .expect(200);

    expect(getResponse.body).toHaveProperty('data');
    const doc = getResponse.body.data;
    expect(doc).toHaveProperty('id');
    expect(doc.id).toBe(createdDocId);
    expect(doc).toHaveProperty('workspaceId');
    expect(doc.workspaceId).toBe(seeded.workspaceId);
    expect(doc).toHaveProperty('title');
    expect(doc.title).toBe('Smoke Doc tenant-repo');
  });
});
