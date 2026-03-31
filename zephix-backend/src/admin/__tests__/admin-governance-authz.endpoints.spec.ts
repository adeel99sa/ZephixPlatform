import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { WorkspacesService } from '../../modules/workspaces/workspaces.service';
import { TeamsService } from '../../modules/teams/teams.service';
import { AttachmentsService } from '../../modules/attachments/services/attachments.service';
import { AuditService } from '../../modules/audit/services/audit.service';
import { WorkspaceMember } from '../../modules/workspaces/entities/workspace-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { GovernanceEvaluation } from '../../modules/governance-rules/entities/governance-evaluation.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { IntegrationConnection } from '../../modules/integrations/entities/integration-connection.entity';
import { AuditEvent } from '../../modules/audit/entities/audit-event.entity';
import { EntitlementService } from '../../modules/billing/entitlements/entitlement.service';

describe('Admin governance endpoint authz', () => {
  let app: INestApplication;

  const organizationsServiceMock = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const adminServiceMock = {
    getOrgSummary: jest.fn(),
  };
  const integrationConnectionRepoMock = {
    find: jest.fn().mockResolvedValue([]),
  };
  const auditEventRepoMock = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: OrganizationsService, useValue: organizationsServiceMock },
        { provide: WorkspacesService, useValue: {} },
        { provide: TeamsService, useValue: {} },
        {
          provide: AttachmentsService,
          useValue: {
            getOrgStorageUsed: jest.fn().mockResolvedValue(0),
            getOrgEffectiveUsage: jest.fn().mockResolvedValue(0),
          },
        },
        { provide: AuditService, useValue: { query: jest.fn() } },
        {
          provide: EntitlementService,
          useValue: { getLimit: jest.fn().mockResolvedValue(30) },
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: { createQueryBuilder: jest.fn() },
        },
        { provide: getRepositoryToken(Project), useValue: {} },
        { provide: getRepositoryToken(GovernanceEvaluation), useValue: {} },
        {
          provide: getRepositoryToken(IntegrationConnection),
          useValue: integrationConnectionRepoMock,
        },
        { provide: getRepositoryToken(AuditEvent), useValue: auditEventRepoMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authorization = req.headers.authorization as string | undefined;
          if (!authorization) {
            throw new UnauthorizedException('Missing bearer token');
          }

          const token = authorization.replace('Bearer ', '').trim();
          const roleByToken: Record<string, 'ADMIN' | 'MEMBER' | 'VIEWER'> = {
            'token-admin': 'ADMIN',
            'token-member': 'MEMBER',
            'token-viewer': 'VIEWER',
          };
          const platformRole = roleByToken[token];
          if (!platformRole) {
            throw new UnauthorizedException('Invalid bearer token');
          }

          req.user = {
            id: `${platformRole.toLowerCase()}-user-1`,
            organizationId: 'org-1',
            platformRole,
          };
          return true;
        },
      })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          if (req.user?.platformRole !== 'ADMIN') {
            throw new ForbiddenException('Admin role required');
          }
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    organizationsServiceMock.findOne.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      status: 'active',
      website: null,
      industry: null,
      size: null,
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      planCode: 'enterprise',
      planStatus: 'active',
      planExpiresAt: null,
      trialEndsAt: null,
      settings: {},
    });
    organizationsServiceMock.update.mockResolvedValue(undefined);
    adminServiceMock.getOrgSummary.mockResolvedValue({
      totalUsers: 3,
      totalWorkspaces: 2,
    });
    integrationConnectionRepoMock.find.mockResolvedValue([]);
    auditEventRepoMock.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/organization/profile', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/organization/profile')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/organization/profile')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/organization/profile')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/organization/profile')
        .expect(401);
    });
  });

  describe('PATCH /admin/organization/profile', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .patch('/admin/organization/profile')
        .set('Authorization', 'Bearer token-admin')
        .send({ name: 'Updated Org' })
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .patch('/admin/organization/profile')
        .set('Authorization', 'Bearer token-member')
        .send({ name: 'Updated Org' })
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .patch('/admin/organization/profile')
        .set('Authorization', 'Bearer token-viewer')
        .send({ name: 'Updated Org' })
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch('/admin/organization/profile')
        .send({ name: 'Updated Org' })
        .expect(401);
    });
  });

  describe('GET /admin/access-control/summary', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/access-control/summary')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/access-control/summary')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/access-control/summary')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/access-control/summary')
        .expect(401);
    });
  });

  describe('GET /admin/integrations/summary', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/summary')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/summary')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/summary')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/summary')
        .expect(401);
    });
  });

  describe('GET /admin/integrations/api-access', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/api-access')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/api-access')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/api-access')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/api-access')
        .expect(401);
    });
  });

  describe('GET /admin/integrations/webhooks', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/webhooks')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/webhooks')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/webhooks')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/integrations/webhooks')
        .expect(401);
    });
  });

  describe('GET /admin/ai-governance/summary', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/summary')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/summary')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/summary')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/summary')
        .expect(401);
    });
  });

  describe('GET /admin/ai-governance/usage', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/usage')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/usage')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/usage')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/ai-governance/usage')
        .expect(401);
    });
  });

  describe('GET /admin/data-management/summary', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/summary')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/summary')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/summary')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/summary')
        .expect(401);
    });
  });

  describe('GET /admin/data-management/exports', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/exports')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/exports')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/exports')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/exports')
        .expect(401);
    });
  });

  describe('GET /admin/data-management/retention', () => {
    it('allows admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/retention')
        .set('Authorization', 'Bearer token-admin')
        .expect(200);
    });

    it('forbids member', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/retention')
        .set('Authorization', 'Bearer token-member')
        .expect(403);
    });

    it('forbids viewer', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/retention')
        .set('Authorization', 'Bearer token-viewer')
        .expect(403);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/admin/data-management/retention')
        .expect(401);
    });
  });
});
