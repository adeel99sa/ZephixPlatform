import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CORS Configuration (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Set CORS origins for testing
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.getzephix.com,https://getzephix.com';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same CORS configuration as main.ts
    const allowed = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    app.enableCors({
      origin: allowed.length > 0 ? allowed : true,
      credentials: true,
      methods: 'GET,HEAD,POST,PUT,PATCH,DELETE',
      allowedHeaders: 'Authorization,Content-Type',
      optionsSuccessStatus: 204
    });

    app.set('trust proxy', 1);
    app.setGlobalPrefix('api');
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  it('should handle CORS preflight request and echo origin header', () => {
    return request(app.getHttpServer())
      .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
      .set('Origin', 'https://app.getzephix.com')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://app.getzephix.com')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect('Access-Control-Allow-Methods', /GET/)
      .expect('Access-Control-Allow-Headers', /Authorization/)
      .expect('Access-Control-Allow-Headers', /Content-Type/);
  });

  it('should reject CORS request from non-allowed origin', () => {
    return request(app.getHttpServer())
      .options('/api/pm/status-reporting/projects/00000000-0000-0000-0000-000000000000/metrics')
      .set('Origin', 'https://malicious-site.com')
      .set('Access-Control-Request-Method', 'GET')
      .expect((res) => {
        // Should not have Access-Control-Allow-Origin header for disallowed origins
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      });
  });

  it('should allow requests from getzephix.com origin', () => {
    return request(app.getHttpServer())
      .options('/api/health')
      .set('Origin', 'https://getzephix.com')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://getzephix.com');
  });
});
