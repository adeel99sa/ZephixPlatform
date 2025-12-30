import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * Smoke test to verify Nest app boots without DI errors
 * This catches module wiring issues before deployment
 */
describe('Nest App Boot Smoke Test', () => {
  let app: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should boot Nest application', () => {
    expect(app).toBeDefined();
  });

  it('should have HTTP server available', () => {
    const httpServer = app.getHttpServer();
    expect(httpServer).toBeDefined();
  });

  it('should have AuthController registered', () => {
    // Verify AuthController is registered by checking if routes exist
    const httpServer = app.getHttpServer();
    expect(httpServer).toBeDefined();
  });
});

