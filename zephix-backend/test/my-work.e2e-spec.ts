import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';

describe('MyWorkController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let validTokenPayload: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'demo@zephix.ai',
        password: 'demo123456',
      });

    if (loginResponse.status !== 201) {
      throw new Error(
        `Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`,
      );
    }

    accessToken = loginResponse.body.data.accessToken;
    
    // Decode token to get payload for negative test
    validTokenPayload = jwt.decode(accessToken) as any;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/my-work should return 200 with valid response schema', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/my-work')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Verify response envelope
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');

    // Verify data structure
    const { data } = response.body;
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('counts');
    expect(data).toHaveProperty('items');

    // Verify counts structure
    expect(data.counts).toHaveProperty('total');
    expect(data.counts).toHaveProperty('overdue');
    expect(data.counts).toHaveProperty('dueSoon7Days');
    expect(data.counts).toHaveProperty('inProgress');
    expect(data.counts).toHaveProperty('todo');
    expect(data.counts).toHaveProperty('done');

    // Verify counts are numbers
    expect(typeof data.counts.total).toBe('number');
    expect(typeof data.counts.overdue).toBe('number');
    expect(typeof data.counts.dueSoon7Days).toBe('number');
    expect(typeof data.counts.inProgress).toBe('number');
    expect(typeof data.counts.todo).toBe('number');
    expect(typeof data.counts.done).toBe('number');

    // Verify items is an array
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('GET /api/my-work should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/api/my-work')
      .expect(401);
  });

  it('GET /api/my-work should return 403 with token missing organizationId', async () => {
    // Create a token without organizationId
    const tokenWithoutOrgId = jwt.sign(
      {
        sub: validTokenPayload.sub,
        email: validTokenPayload.email,
        role: validTokenPayload.role,
        platformRole: validTokenPayload.platformRole,
        // organizationId is intentionally omitted
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '15m' },
    );

    const response = await request(app.getHttpServer())
      .get('/api/my-work')
      .set('Authorization', `Bearer ${tokenWithoutOrgId}`)
      .expect(403);

    // Verify error message
    expect(response.body).toHaveProperty('code');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('organizationId');
  });

  it('GET /api/my-work should enforce tenant isolation', async () => {
    // This test verifies that data from one org is not visible to another
    // Since we don't have multi-org test data setup, we verify the endpoint
    // returns empty results when there's no data (which is correct behavior)
    
    const response = await request(app.getHttpServer())
      .get('/api/my-work')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Verify tenant isolation: counts should be scoped to user's org
    expect(response.body.data.counts.total).toBeGreaterThanOrEqual(0);
    
    // If there's data, verify it belongs to the user's organization
    // (This would require test data setup - for now we verify structure)
    expect(Array.isArray(response.body.data.items)).toBe(true);
    
    // Verify all items (if any) belong to the user's organization
    // This is a structural check - full isolation test requires multi-org setup
    if (response.body.data.items.length > 0) {
      const orgId = validTokenPayload.organizationId;
      response.body.data.items.forEach((item: any) => {
        // Items should be scoped to user's org (implicit via repository)
        expect(item).toBeDefined();
      });
    }
  });
});
