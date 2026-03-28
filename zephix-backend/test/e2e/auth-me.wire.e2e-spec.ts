import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuthRegistrationService } from '../../src/modules/auth/services/auth-registration.service';
import { EmailVerificationService } from '../../src/modules/auth/services/email-verification.service';
import { AuditService } from '../../src/modules/audit/services/audit.service';
import { OptionalJwtAuthGuard } from '../../src/modules/auth/guards/optional-jwt-auth.guard';
import { RateLimiterGuard } from '../../src/common/guards/rate-limiter.guard';
import { EnvelopeInterceptor } from '../../src/shared/interceptors/envelope.interceptor';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';

class MockOptionalJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers?.authorization || '');
    if (auth === 'Bearer wire-test-token') {
      req.user = { id: 'user-1' };
    }
    return true;
  }
}

class AllowAllGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

describe('/api/auth/me wire contract (e2e)', () => {
  let app: INestApplication;
  const authService = {
    getUserById: jest.fn(),
    buildUserResponse: jest.fn(),
  };
  const userOrgRepository = { findOne: jest.fn() };
  const organizationRepository = { findOne: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthRegistrationService, useValue: {} },
        { provide: EmailVerificationService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: getRepositoryToken(UserOrganization), useValue: userOrgRepository },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
      ],
    })
      .overrideGuard(OptionalJwtAuthGuard)
      .useClass(MockOptionalJwtAuthGuard)
      .overrideGuard(RateLimiterGuard)
      .useClass(AllowAllGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new EnvelopeInterceptor());
    app.use((req: any, _res: any, next: () => void) => {
      req.id = req.id || 'wire-test-request-id';
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unauthenticated GET /api/auth/me returns { data: { user: null } }', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me').expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual({ user: null });
    // Current runtime behavior: EnvelopeInterceptor bypasses objects that already include top-level "data".
    expect(response.body).not.toHaveProperty('meta');
  });

  it('authenticated GET /api/auth/me returns { data: { user } }', async () => {
    authService.getUserById.mockResolvedValue({
      id: 'user-1',
      email: 'demo@zephix.ai',
      organizationId: 'org-1',
    });
    userOrgRepository.findOne.mockResolvedValue({ role: 'admin' });
    organizationRepository.findOne.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      settings: { features: {} },
    });
    authService.buildUserResponse.mockReturnValue({
      id: 'user-1',
      organizationId: 'org-1',
      platformRole: 'ADMIN',
    });

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer wire-test-token')
      .expect(200);

    expect(response.body?.data?.user?.id).toBe('user-1');
    expect(response.body?.data?.user?.organizationId).toBe('org-1');
    expect(response.body?.data?.user?.platformRole).toBe('ADMIN');
    expect(response.body).not.toHaveProperty('meta');
  });
});
