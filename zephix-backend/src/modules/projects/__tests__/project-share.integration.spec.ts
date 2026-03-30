import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireWorkspaceAccessGuard } from '../../workspaces/guards/require-workspace-access.guard';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { ProjectsController } from '../projects.controller';
import { ProjectsViewController } from '../controllers/projects-view.controller';
import { WorkspacesController } from '../../workspaces/workspaces.controller';
import { ProjectsService } from '../services/projects.service';
import { ProjectsViewService } from '../services/projects-view.service';
import { RequireProjectWorkspaceRoleGuard } from '../guards/require-project-workspace-role.guard';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Project } from '../entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { WorkspaceMembersService } from '../../workspaces/services/workspace-members.service';
import { WorkspacePolicy } from '../../workspaces/workspace.policy';
import { ResourceRiskScoreService } from '../../resources/services/resource-risk-score.service';
import { ResponseService } from '../../../shared/services/response.service';
import { WorkspaceInviteService } from '../../workspaces/services/workspace-invite.service';
import { WorkspaceHealthService } from '../../workspaces/services/workspace-health.service';
import { Reflector } from '@nestjs/core';
import { RequireWorkspacePermissionGuard } from '../../workspaces/guards/require-workspace-permission.guard';
import { RequireOrgRoleGuard } from '../../workspaces/guards/require-org-role.guard';
import { WorkspaceMembershipFeatureGuard } from '../../workspaces/guards/feature-flag.guard';
import { RequireWorkspaceRoleGuard } from '../../workspaces/guards/require-workspace-role.guard';
import { WorkspacePermissionService } from '../../workspaces/services/workspace-permission.service';

jest.setTimeout(60000);

describe('Project Share Integration Gate (e2e)', () => {
  let app: INestApplication;
  const orgId = 'org-1';
  const workspaceId = 'ws-1';
  const sharedProjectId = 'project-shared';
  const siblingProjectId = 'project-sibling';

  const userOwnerId = 'user-owner';
  const userProjectOnlyId = 'user-project-only';
  const userWorkspaceMemberId = 'user-workspace-member';
  const userWorkspaceOwnerId = 'user-workspace-owner';

  const users = new Map<
    string,
    { id: string; email: string; organizationId: string; isActive: boolean }
  >([
    [
      userOwnerId,
      {
        id: userOwnerId,
        email: 'owner@zephix.test',
        organizationId: orgId,
        isActive: true,
      },
    ],
    [
      userProjectOnlyId,
      {
        id: userProjectOnlyId,
        email: 'project-only@zephix.test',
        organizationId: orgId,
        isActive: true,
      },
    ],
    [
      userWorkspaceMemberId,
      {
        id: userWorkspaceMemberId,
        email: 'member@zephix.test',
        organizationId: orgId,
        isActive: true,
      },
    ],
    [
      userWorkspaceOwnerId,
      {
        id: userWorkspaceOwnerId,
        email: 'workspace-owner@zephix.test',
        organizationId: orgId,
        isActive: true,
      },
    ],
  ]);

  const workspaces = new Map<
    string,
    {
      id: string;
      organizationId: string;
      name: string;
      slug: string;
      isPrivate: boolean;
      createdAt: Date;
      deletedAt: Date | null;
    }
  >([
    [
      workspaceId,
      {
        id: workspaceId,
        organizationId: orgId,
        name: 'Integration Workspace',
        slug: 'integration-workspace',
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
      },
    ],
  ]);

  let workspaceMembers = [
    {
      id: 'wm-owner',
      workspaceId,
      userId: userOwnerId,
      role: 'workspace_owner',
      status: 'active',
      workspace: workspaces.get(workspaceId),
    },
    {
      id: 'wm-member',
      workspaceId,
      userId: userWorkspaceMemberId,
      role: 'workspace_member',
      status: 'active',
      workspace: workspaces.get(workspaceId),
    },
    {
      id: 'wm-owner-2',
      workspaceId,
      userId: userWorkspaceOwnerId,
      role: 'workspace_owner',
      status: 'active',
      workspace: workspaces.get(workspaceId),
    },
  ];

  let projects = [
    {
      id: sharedProjectId,
      organizationId: orgId,
      workspaceId,
      name: 'Shared Project',
      deletedAt: null,
      projectManagerId: null as string | null,
      deliveryOwnerUserId: null as string | null,
      createdAt: new Date(),
    },
    {
      id: siblingProjectId,
      organizationId: orgId,
      workspaceId,
      name: 'Sibling Project',
      deletedAt: null,
      projectManagerId: null as string | null,
      deliveryOwnerUserId: null as string | null,
      createdAt: new Date(),
    },
  ];

  const authTokens = new Map<string, any>([
    [
      'token-owner',
      {
        id: userOwnerId,
        sub: userOwnerId,
        email: 'owner@zephix.test',
        organizationId: orgId,
        role: 'member',
        platformRole: 'MEMBER',
      },
    ],
    [
      'token-project-only',
      {
        id: userProjectOnlyId,
        sub: userProjectOnlyId,
        email: 'project-only@zephix.test',
        organizationId: orgId,
        role: 'member',
        platformRole: 'MEMBER',
      },
    ],
    [
      'token-member',
      {
        id: userWorkspaceMemberId,
        sub: userWorkspaceMemberId,
        email: 'member@zephix.test',
        organizationId: orgId,
        role: 'member',
        platformRole: 'MEMBER',
      },
    ],
    [
      'token-owner-2',
      {
        id: userWorkspaceOwnerId,
        sub: userWorkspaceOwnerId,
        email: 'workspace-owner@zephix.test',
        organizationId: orgId,
        role: 'member',
        platformRole: 'MEMBER',
      },
    ],
  ]);

  beforeAll(async () => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'ZEPHIX_WS_MEMBERSHIP_V1' ? '1' : undefined,
      ),
    };

    const tenantContextService = {
      assertOrganizationId: jest.fn().mockReturnValue(orgId),
      getOrganizationId: jest.fn().mockReturnValue(orgId),
      getWorkspaceId: jest.fn().mockReturnValue(workspaceId),
      runWithTenant: jest
        .fn()
        .mockImplementation(async (_ctx: any, fn: () => any) => fn()),
    };

    const projectQueryBuilderFactory = () => {
      const conditions: Array<{ sql: string; params?: Record<string, any> }> = [];
      let skipValue = 0;
      let takeValue = 50;

      const qb = {
        where(sql: string, params?: Record<string, any>) {
          conditions.push({ sql, params });
          return qb;
        },
        andWhere(sql: string, params?: Record<string, any>) {
          conditions.push({ sql, params });
          return qb;
        },
        orderBy() {
          return qb;
        },
        skip(value: number) {
          skipValue = value;
          return qb;
        },
        take(value: number) {
          takeValue = value;
          return qb;
        },
        async getManyAndCount() {
          let filtered = [...projects];
          for (const condition of conditions) {
            const sql = condition.sql;
            const params = condition.params || {};
            if (sql.includes('project.organizationId = :orgId')) {
              filtered = filtered.filter((p) => p.organizationId === params.orgId);
            } else if (sql.includes('project.deletedAt IS NULL')) {
              filtered = filtered.filter((p) => p.deletedAt === null);
            } else if (sql.includes('project.workspaceId = :workspaceId')) {
              filtered = filtered.filter((p) => p.workspaceId === params.workspaceId);
            } else if (
              sql.includes(
                '(project.projectManagerId = :userId OR project.deliveryOwnerUserId = :userId)',
              )
            ) {
              filtered = filtered.filter(
                (p) =>
                  p.projectManagerId === params.userId ||
                  p.deliveryOwnerUserId === params.userId,
              );
            } else if (sql.includes('project.workspaceId IN (:...workspaceIds)')) {
              filtered = filtered.filter((p) =>
                (params.workspaceIds || []).includes(p.workspaceId),
              );
            }
          }
          const total = filtered.length;
          return [filtered.slice(skipValue, skipValue + takeValue), total];
        },
      };
      return qb;
    };

    const projectTenantQbFactory = () => {
      const conditions: Array<{ sql: string; params?: Record<string, any> }> = [];
      const qb = {
        select() {
          return qb;
        },
        andWhere(sql: string, params?: Record<string, any>) {
          conditions.push({ sql, params });
          return qb;
        },
        async getRawMany() {
          let filtered = [...projects];
          for (const condition of conditions) {
            const sql = condition.sql;
            const params = condition.params || {};
            if (sql.includes('p.deletedAt IS NULL')) {
              filtered = filtered.filter((p) => p.deletedAt === null);
            } else if (sql.includes('p.workspaceId IS NOT NULL')) {
              filtered = filtered.filter((p) => !!p.workspaceId);
            } else if (
              sql.includes('(p.projectManagerId = :userId OR p.deliveryOwnerUserId = :userId)')
            ) {
              filtered = filtered.filter(
                (p) =>
                  p.projectManagerId === params.userId ||
                  p.deliveryOwnerUserId === params.userId,
              );
            }
          }
          const workspaceIds = Array.from(new Set(filtered.map((p) => p.workspaceId)));
          return workspaceIds.map((id) => ({ workspaceId: id }));
        },
      };
      return qb;
    };

    const projectRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }: any) => {
        return (
          projects.find(
            (p) =>
              p.id === where?.id &&
              (!where?.organizationId || p.organizationId === where.organizationId),
          ) || null
        );
      }),
      save: jest.fn().mockImplementation(async (input: any) => {
        const index = projects.findIndex((p) => p.id === input.id);
        if (index >= 0) {
          projects[index] = { ...projects[index], ...input };
          return projects[index];
        }
        projects.push(input);
        return input;
      }),
      createQueryBuilder: jest.fn().mockImplementation(projectQueryBuilderFactory),
    };

    const projectTenantRepository = {
      qb: jest.fn().mockImplementation(projectTenantQbFactory),
      count: jest.fn().mockImplementation(async ({ where }: any) => {
        const conditions = Array.isArray(where) ? where : [where];
        return projects.filter((project) =>
          conditions.some((condition: any) => {
            const matchesWorkspace = condition.workspaceId === project.workspaceId;
            const matchesManager =
              condition.projectManagerId === project.projectManagerId;
            const matchesOwner =
              condition.deliveryOwnerUserId === project.deliveryOwnerUserId;
            const active = project.deletedAt === null;
            return matchesWorkspace && (matchesManager || matchesOwner) && active;
          }),
        ).length;
      }),
    };

    const workspaceMemberTenantRepository = {
      find: jest.fn().mockImplementation(async ({ where }: any) => {
        return workspaceMembers.filter((member) => member.userId === where.userId);
      }),
      findOne: jest.fn().mockImplementation(async ({ where }: any) => {
        return (
          workspaceMembers.find(
            (member) =>
              member.workspaceId === where.workspaceId && member.userId === where.userId,
          ) || null
        );
      }),
    };

    const workspaceTenantRepository = {
      metadata: {
        columns: [{}],
        deleteDateColumn: { propertyName: 'deletedAt' },
      },
      find: jest.fn().mockImplementation(async () => [...workspaces.values()]),
      findOne: jest.fn().mockImplementation(async ({ where }: any) => {
        return (
          [...workspaces.values()].find(
            (workspace) =>
              workspace.id === where.id && workspace.organizationId === where.organizationId,
          ) || null
        );
      }),
      qb: jest.fn().mockImplementation(() => {
        let ids: string[] = [];
        const qb = {
          andWhere(sql: string, params?: Record<string, any>) {
            if (sql.includes('w.id IN (:...workspaceIds)')) {
              ids = params?.workspaceIds || [];
            }
            return qb;
          },
          orderBy() {
            return qb;
          },
          async getMany() {
            return [...workspaces.values()].filter((workspace) =>
              ids.includes(workspace.id),
            );
          },
        };
        return qb;
      }),
    };

    const userRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }: any) => {
        const user = users.get(where.id);
        if (!user) return null;
        if (user.organizationId !== where.organizationId) return null;
        return user;
      }),
    };

    const workspaceAccessService = new WorkspaceAccessService(
      workspaceMemberTenantRepository as any,
      projectTenantRepository as any,
      configService as any,
      tenantContextService as any,
    );

    const projectsService = new ProjectsService(
      projectRepository as any,
      workspaceTenantRepository as any,
      userRepository as any,
      {} as any,
      {} as any,
      tenantContextService as any,
      configService as any,
      workspaceAccessService as any,
      { assertWithinLimit: jest.fn() } as any,
      {} as any,
      {} as any,
    );
    jest
      .spyOn(projectsService as any, 'findById')
      .mockImplementation(async (id: string, organizationId: string) => {
        return (
          projects.find(
            (project) =>
              project.id === id && project.organizationId === organizationId,
          ) || null
        );
      });

    const workspacesService = new WorkspacesService(
      workspaceTenantRepository as any,
      workspaceMemberTenantRepository as any,
      projectTenantRepository as any,
      { count: jest.fn() } as any,
      configService as any,
      {} as any,
      tenantContextService as any,
      workspaceAccessService as any,
    );

    (JwtAuthGuard as any).prototype.canActivate = function (
      context: ExecutionContext,
    ) {
      const request = context.switchToHttp().getRequest();
      const raw = request.headers?.authorization || '';
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
      if (!token || !authTokens.has(token)) {
        throw new UnauthorizedException('Unauthorized');
      }
      request.user = authTokens.get(token);
      return true;
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController, ProjectsViewController, WorkspacesController],
      providers: [
        Reflector,
        RequireProjectWorkspaceRoleGuard,
        { provide: ProjectsService, useValue: projectsService },
        { provide: ProjectsViewService, useValue: {} },
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: WorkspaceAccessService, useValue: workspaceAccessService },
        { provide: JwtAuthGuard, useValue: {} },
        { provide: RequireWorkspaceAccessGuard, useValue: { canActivate: () => true } },
        {
          provide: RequireWorkspacePermissionGuard,
          useValue: { canActivate: () => true },
        },
        { provide: RequireOrgRoleGuard, useValue: { canActivate: () => true } },
        {
          provide: WorkspaceMembershipFeatureGuard,
          useValue: { canActivate: () => true },
        },
        { provide: RequireWorkspaceRoleGuard, useValue: { canActivate: () => true } },
        { provide: WorkspacePermissionService, useValue: { isAllowed: () => true } },
        { provide: ConfigService, useValue: configService },
        { provide: TenantContextService, useValue: tenantContextService },
        { provide: getRepositoryToken(Project), useValue: projectRepository },
        { provide: getTenantAwareRepositoryToken(Project), useValue: projectTenantRepository },
        {
          provide: getTenantAwareRepositoryToken(WorkspaceMember),
          useValue: workspaceMemberTenantRepository,
        },
        {
          provide: getTenantAwareRepositoryToken(Workspace),
          useValue: workspaceTenantRepository,
        },
        { provide: WorkspaceMembersService, useValue: {} },
        { provide: WorkspacePolicy, useValue: {} },
        { provide: ResourceRiskScoreService, useValue: {} },
        { provide: ResponseService, useValue: {} },
        { provide: WorkspaceInviteService, useValue: {} },
        { provide: WorkspaceHealthService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('admin/owner shares project to non-member and project-only visibility is enforced', async () => {
    const ownerToken = 'token-owner';
    const projectOnlyToken = 'token-project-only';

    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: userProjectOnlyId, accessLevel: 'delivery_owner' })
      .expect(201);

    const projectRead = await request(app.getHttpServer())
      .get(`/api/projects/${sharedProjectId}`)
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .expect(200);
    expect(projectRead.body?.data?.id).toBe(sharedProjectId);

    const workspaceProjectList = await request(app.getHttpServer())
      .get(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .expect(200);
    const projects = workspaceProjectList.body?.data?.projects || [];
    const listedIds = projects.map((project: any) => project.id);
    expect(listedIds).toContain(sharedProjectId);
    expect(listedIds).not.toContain(siblingProjectId);

    const workspaceList = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .expect(200);
    const workspaceIds = (workspaceList.body?.data || []).map((workspace: any) => workspace.id);
    expect(workspaceIds).toContain(workspaceId);
  });

  it('unshare revokes access immediately and removes workspace container access (403 path)', async () => {
    const ownerToken = 'token-owner';
    const projectOnlyToken = 'token-project-only';

    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: userProjectOnlyId, accessLevel: 'delivery_owner' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/projects/${sharedProjectId}`)
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/projects/${sharedProjectId}/share/${userProjectOnlyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/projects/${sharedProjectId}`)
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .expect(403);

    // After last share is removed for a non-member, container access is removed too.
    await request(app.getHttpServer())
      .get(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .expect(403);
  });

  it('rejects share attempt when target user is already workspace member', async () => {
    const ownerToken = 'token-owner';

    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: userWorkspaceMemberId, accessLevel: 'delivery_owner' })
      .expect(409);
  });

  it('rejects non-admin non-owner and project-only share attempts', async () => {
    const memberToken = 'token-member';
    const ownerToken = 'token-owner';
    const projectOnlyToken = 'token-project-only';

    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ userId: userWorkspaceOwnerId, accessLevel: 'delivery_owner' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: userProjectOnlyId, accessLevel: 'delivery_owner' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .set('Authorization', `Bearer ${projectOnlyToken}`)
      .send({ userId: userWorkspaceOwnerId, accessLevel: 'delivery_owner' })
      .expect(403);
  });

  it('rejects unauthenticated share attempt', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${sharedProjectId}/share`)
      .send({ userId: userProjectOnlyId })
      .expect(401);
  });
});
