import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'development';
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.RATE_LIMIT_ENABLED = 'false';
    process.env.HELMET_ENABLED = 'true';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as main.ts
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true 
    }));
    
    // Set the same global prefix as main.ts
    app.setGlobalPrefix('api');
    
    // Enable CORS for testing
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
      methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      allowedHeaders: 'Authorization,Content-Type,Accept,Origin,X-Requested-With,X-Timestamp',
      exposedHeaders: 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset',
      optionsSuccessStatus: 200,
    });
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Smoke Tests', () => {
    it('should bootstrap successfully', async () => {
      // This test passes if beforeEach completes without throwing
      expect(app).toBeDefined();
      expect(app.get).toBeDefined();
    });

    it('/api/health (GET) should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('Zephix Backend Service');
          expect(res.body.database).toBe('connected');
        });
    });

    it('/api/_status (GET) should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/_status')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('Zephix Backend Service');
          expect(res.body.uptime).toBeGreaterThan(0);
        });
    });

    it('/api/metrics (GET) should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/metrics')
        .expect(401);
    });
  });

  describe('CORS Tests', () => {
    it('should handle CORS preflight for health endpoint', () => {
      return request(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
        .expect('Access-Control-Allow-Methods', /GET/);
    });

    it('should include CORS headers on actual requests', () => {
      return request(app.getHttpServer())
        .get('/api/_status')
        .set('Origin', 'http://localhost:3000')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'http://localhost:3000');
    });
  });

  describe('App Controller', () => {
    it('/api (GET)', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });
  });
});
