import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { loginAndGetToken, authHeader } from '../utils/e2e-auth';

describe('Workspaces Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    accessToken = await loginAndGetToken(app, 'demo@zephix.ai', 'demo123456');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/workspaces should return array with id and organizationId', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);

    // Verify structure of first workspace if any exist
    if (response.body.data.length > 0) {
      const workspace = response.body.data[0];
      expect(workspace).toHaveProperty('id');
      expect(workspace).toHaveProperty('organizationId');
      expect(typeof workspace.id).toBe('string');
      expect(typeof workspace.organizationId).toBe('string');
    }
  });
});
