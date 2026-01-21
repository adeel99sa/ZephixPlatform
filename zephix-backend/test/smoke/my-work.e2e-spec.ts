import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { authHeader } from '../utils/e2e-auth';
import { seedWorkspaceMvp } from '../utils/e2e-seed';

describe('My Work Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let seeded: Awaited<ReturnType<typeof seedWorkspaceMvp>>;

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

  it('GET /api/my-work should return schema with version, counts, and items', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/my-work')
      .set(authHeader(seeded.token))
      .expect(200);

    expect(response.body).toHaveProperty('data');
    const { data } = response.body;

    // Verify version
    expect(data).toHaveProperty('version');
    expect(typeof data.version).toBe('number');

    // Verify counts
    expect(data).toHaveProperty('counts');
    expect(data.counts).toHaveProperty('total');
    expect(typeof data.counts.total).toBe('number');

    // Verify items
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });
});
