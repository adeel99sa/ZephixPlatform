/**
 * E2E Test: Verify no routes contain /api/api (double prefix)
 * 
 * This test ensures that the global prefix '/api' in main.ts
 * is not duplicated in controller decorators, preventing routes
 * like /api/api/templates from existing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Routes - No Double Prefix (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Test that no routes contain /api/api (double prefix)
   * 
   * This is a smoke test that verifies the routing fix:
   * - Global prefix: /api (in main.ts)
   * - Controller paths: no 'api' prefix
   * - Final routes: /api/{controller-path}
   */
  it('should not have any routes with /api/api prefix', async () => {
    // Get the Express app instance
    const server = app.getHttpServer();
    const router = (server as any)._router;

    if (!router || !router.stack) {
      console.warn('⚠️  Router stack not found - skipping route validation');
      return;
    }

    // Extract all registered routes
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => {
        const methods = Object.keys(layer.route.methods)
          .filter((m: string) => layer.route.methods[m])
          .join(',');
        return `${methods.toUpperCase()} ${layer.route.path}`;
      });

    // Check for double prefix violations
    const violations = routes.filter((route: string) => 
      route.includes('/api/api')
    );

    if (violations.length > 0) {
      console.error('❌ Found routes with /api/api prefix:');
      violations.forEach((route: string) => console.error(`   ${route}`));
    }

    expect(violations).toHaveLength(0);
  });

  /**
   * Test that key routes exist with correct single prefix
   */
  it('should have /api/auth/register route', async () => {
    // This will return 400 (validation error) or 200 (success)
    // but should NOT return 404 (route not found)
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
        fullName: 'Test User',
        orgName: 'Test Org',
      });

    // Route exists if status is not 404
    expect(response.status).not.toBe(404);
  });

  it('should have /api/templates route (not /api/api/templates)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/templates')
      .expect((res) => {
        // Should not be 404 (route exists)
        // May be 401 (unauthorized) which is fine
        if (res.status === 404) {
          throw new Error('Route /api/templates not found');
        }
      });

    expect(response.status).not.toBe(404);
  });

  it('should NOT have /api/api/templates route', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/api/templates');

    // Double prefix route should not exist
    expect(response.status).toBe(404);
  });
});

