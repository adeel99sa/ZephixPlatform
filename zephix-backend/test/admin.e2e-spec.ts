import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();

    // Create admin JWT token
    adminToken = jwtService.sign({
      sub: 'admin-user-id',
      email: 'admin@zephix.ai',
      role: 'admin'
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/admin/stats (GET)', () => {
    it('should return admin statistics for authenticated admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userCount');
      expect(response.body).toHaveProperty('templateCount');
      expect(response.body).toHaveProperty('projectCount');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('lastActivity');
      expect(response.body).toHaveProperty('recentActivities');
      expect(typeof response.body.userCount).toBe('number');
      expect(typeof response.body.templateCount).toBe('number');
      expect(typeof response.body.projectCount).toBe('number');
      expect(typeof response.body.activeUsers).toBe('number');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/admin/stats')
        .expect(401);
    });

    it('should reject non-admin users', async () => {
      const userToken = jwtService.sign({
        sub: 'user-id',
        email: 'user@example.com',
        role: 'user'
      });

      await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/admin/users (GET)', () => {
    it('should return paginated users for authenticated admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });

    it('should handle search parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('/admin/audit (POST)', () => {
    it('should create audit log entry for authenticated admin user', async () => {
      const auditData = {
        action: 'test.action',
        entityType: 'test',
        entityId: 'test-id',
        oldValues: { field: 'old' },
        newValues: { field: 'new' }
      };

      const response = await request(app.getHttpServer())
        .post('/admin/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(auditData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('action', 'test.action');
      expect(response.body).toHaveProperty('entityType', 'test');
      expect(response.body).toHaveProperty('entityId', 'test-id');
    });

    it('should reject invalid audit data', async () => {
      const invalidData = {
        // Missing required action field
        entityType: 'test'
      };

      await request(app.getHttpServer())
        .post('/admin/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('/admin/audit (GET)', () => {
    it('should return audit logs for authenticated admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });
  });
});
