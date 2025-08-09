import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Set rate limiting environment variables for testing
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
    process.env.RATE_LIMIT_MAX = '5'; // Very low limit for testing
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same rate limiting configuration as main.ts
    const enabled = process.env.RATE_LIMIT_ENABLED === 'true';
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
    const max = Number(process.env.RATE_LIMIT_MAX || 100);
    
    if (enabled) {
      app.use(rateLimit({
        windowMs,
        max,
        skip: req => req.path === '/api/health',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(429).json({
            statusCode: 429,
            message: 'Too Many Requests',
            error: 'Rate limit exceeded'
          });
        }
      }));
    }

    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it('should allow requests under the rate limit', async () => {
    // Make requests under the limit (5)
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .get('/api')
        .expect(200);
    }
  });

  it('should return 429 when rate limit exceeded', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/api')
        .expect(200);
    }

    // Next request should be rate limited
    await request(app.getHttpServer())
      .get('/api')
      .expect(429)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 429,
          message: 'Too Many Requests',
          error: 'Rate limit exceeded'
        });
      });
  });

  it('should skip rate limiting for health endpoint', async () => {
    // Make many requests to health endpoint - should not be rate limited
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
    }
  });

  it('should include rate limit headers', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-ratelimit-limit']).toBeDefined();
        expect(res.headers['x-ratelimit-remaining']).toBeDefined();
        expect(res.headers['x-ratelimit-reset']).toBeDefined();
      });
  });
});

describe('Rate Limiting Disabled (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Disable rate limiting
    process.env.RATE_LIMIT_ENABLED = 'false';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.RATE_LIMIT_ENABLED;
  });

  it('should allow unlimited requests when rate limiting is disabled', async () => {
    // Make many requests - should all succeed
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer())
        .get('/api')
        .expect(200);
    }
  });
});
