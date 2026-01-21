import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { loginAndGetToken, authHeader } from '../utils/e2e-auth';

describe('Tenant Isolation Security Tests (e2e)', () => {
  let app: INestApplication;
  let validToken: string;
  let validTokenPayload: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Get a valid token to extract payload
    validToken = await loginAndGetToken(app, 'demo@zephix.ai', 'demo123456');
    validTokenPayload = jwt.decode(validToken) as any;
  });

  afterAll(async () => {
    await app.close();
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
      .set(authHeader(tokenWithoutOrgId))
      .expect(403);

    // Verify error message references organizationId
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('organizationId');
  });

  it('Cross tenant read should be blocked', async () => {
    // Get workspaces for the authenticated user
    const workspacesResponse = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set(authHeader(validToken))
      .expect(200);

    const userWorkspaces = workspacesResponse.body.data;
    if (userWorkspaces.length === 0) {
      // No workspaces to test with
      return;
    }

    const userOrgId = validTokenPayload.organizationId;
    const userWorkspace = userWorkspaces[0];

    // Verify workspace belongs to user's org
    expect(userWorkspace.organizationId).toBe(userOrgId);

    // Create a token for a different organization
    const otherOrgId = 'other-org-id-' + Date.now();
    const otherOrgToken = jwt.sign(
      {
        sub: validTokenPayload.sub,
        email: validTokenPayload.email,
        role: validTokenPayload.role,
        platformRole: validTokenPayload.platformRole,
        organizationId: otherOrgId,
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '15m' },
    );

    // Try to access workspace from different org - should be blocked
    // This tests that workspace list is filtered by organizationId
    const otherOrgWorkspacesResponse = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set(authHeader(otherOrgToken))
      .expect(200);

    // Workspace list should not include workspaces from other org
    const otherOrgWorkspaces = otherOrgWorkspacesResponse.body.data;
    const foundUserWorkspace = otherOrgWorkspaces.find(
      (w: any) => w.id === userWorkspace.id,
    );
    expect(foundUserWorkspace).toBeUndefined();
  });
});
