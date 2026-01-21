import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('Workspaces Contract Tests (Envelope Format)', () => {
  // Note: Contract tests assert { data } format only (no meta field)
  // Meta is only included in paginated endpoints or error responses
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create a test token
    const jwtService = app.get(JwtService);
    accessToken = jwtService.sign({
      sub: 'test-user-id',
      email: 'test@example.com',
      organizationId: 'test-org-id',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/workspaces', () => {
    it('should return envelope format { data }', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/workspaces', () => {
    it('should return envelope format { data } on success', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        isPrivate: false,
      };

      const response = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(workspaceData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'Test Workspace');
    });

    it('should return envelope format { error } on validation error', async () => {
      const invalidData = {
        // missing required fields
      };

      const response = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });

  describe('GET /api/admin/trash', () => {
    it('should return envelope format { data }', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/trash?type=workspace')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Error responses', () => {
    it('should return envelope format { error } for 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'UNAUTHENTICATED');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
    });

    it('should return envelope format { error } for 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces/nonexistent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });
});
