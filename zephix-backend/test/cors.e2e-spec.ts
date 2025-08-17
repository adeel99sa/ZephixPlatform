import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CORS Configuration (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Set test environment variables for CORS
    process.env.CORS_ALLOWED_ORIGINS = 'https://getzephix.com,https://www.getzephix.com,https://app.getzephix.com,https://api.getzephix.com';
    process.env.NODE_ENV = 'production';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same middleware configuration as main.ts
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Reject origin
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      },
      credentials: true,
      methods: 'GET,HEAD,POST,PUT,PATCH,DELETE',
      allowedHeaders: 'Authorization,Content-Type,X-Timestamp',
      optionsSuccessStatus: 204
    });
    
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.NODE_ENV;
  });

  describe('CORS Preflight Requests', () => {
    it('should echo allowed origin: https://app.getzephix.com', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://app.getzephix.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('https://app.getzephix.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['vary']).toContain('Origin');
    });

    it('should echo allowed origin: https://getzephix.com', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://getzephix.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('https://getzephix.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should echo allowed origin: https://www.getzephix.com', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://www.getzephix.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('https://www.getzephix.com');
    });

    it('should echo allowed origin: https://api.getzephix.com', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://api.getzephix.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('https://api.getzephix.com');
    });

    it('should reject disallowed origin', async () => {
      await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(500); // CORS error should result in 500
    });

    it('should allow requests with no origin (e.g., mobile apps)', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      // No origin header should be present when no origin is sent
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('CORS Headers on Actual Requests', () => {
    it('should include CORS headers on GET requests with allowed origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'https://app.getzephix.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://app.getzephix.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['vary']).toContain('Origin');
    });

    it('should reject actual requests from disallowed origins', async () => {
      await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(500); // CORS error
    });
  });

  describe('CORS Methods and Headers', () => {
    it('should support all required HTTP methods', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://app.getzephix.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('PATCH');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('HEAD');
    });

    it('should support required headers', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
        .set('Origin', 'https://app.getzephix.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Authorization,Content-Type')
        .expect(204);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toContain('Authorization');
      expect(allowedHeaders).toContain('Content-Type');
    });
  });
});
