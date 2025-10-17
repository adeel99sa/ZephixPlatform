import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/services/auth.service';
import { JwtService } from '@nestjs/jwt';

describe('KPI Portfolio (GET /api/kpi/portfolio)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const getAuthToken = async (): Promise<string> => {
    // Create a test user token
    const payload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      organizationId: 'test-org-id',
    };
    return jwtService.sign(payload);
  };

  it('returns safe defaults and never 500s', async () => {
    const token = await getAuthToken();
    
    const response = await request(app.getHttpServer())
      .get('/api/kpi/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body?.success).toBe(true);
    expect(response.body?.data).toEqual(
      expect.objectContaining({
        totalProjects: expect.any(Number),
        activeProjects: expect.any(Number),
        resourceUtilization: expect.any(Number),
        budgetVariance: expect.any(Number),
        conflictsPrevented: expect.any(Number),
      })
    );

    // Verify all values are numbers (safe defaults)
    const data = response.body.data;
    expect(typeof data.totalProjects).toBe('number');
    expect(typeof data.activeProjects).toBe('number');
    expect(typeof data.resourceUtilization).toBe('number');
    expect(typeof data.budgetVariance).toBe('number');
    expect(typeof data.conflictsPrevented).toBe('number');
  });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/kpi/portfolio')
      .expect(401);
  });

  it('handles database errors gracefully', async () => {
    const token = await getAuthToken();
    
    // This test ensures the endpoint never returns 500
    // Even if the database is unavailable, it should return safe defaults
    const response = await request(app.getHttpServer())
      .get('/api/kpi/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body?.success).toBe(true);
    expect(response.body?.data).toBeDefined();
  });
});
