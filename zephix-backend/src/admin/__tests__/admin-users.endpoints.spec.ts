import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { IntegrationConnection } from '../../modules/integrations/entities/integration-connection.entity';
import { AuditEvent } from '../../modules/audit/entities/audit-event.entity';
import { EntitlementService } from '../../modules/billing/entitlements/entitlement.service';

describe('AdminController users endpoints', () => {
  let controller: AdminController;
  const organizationsService = {
    getOrganizationUsers: jest.fn(),
    updateUserRole: jest.fn(),
    removeUser: jest.fn(),
  };
  const workspaceMemberRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: {} },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: WorkspacesService, useValue: {} },
        { provide: TeamsService, useValue: {} },
        {
          provide: AttachmentsService,
          useValue: {
            getOrgStorageUsed: jest.fn().mockResolvedValue(0),
            getOrgEffectiveUsage: jest.fn().mockResolvedValue(0),
          },
        },
        { provide: EntitlementService, useValue: { getLimit: jest.fn().mockResolvedValue(30) } },
        { provide: AuditService, useValue: {} },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: workspaceMemberRepo,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
        {
          provide: getRepositoryToken(GovernanceEvaluation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(IntegrationConnection),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
      ],
    }).compile();
    controller = moduleRef.get(AdminController);
    jest.clearAllMocks();
  });

  it('returns users with data/meta and workspaceAccess mapping', async () => {
    organizationsService.getOrganizationUsers.mockResolvedValue({
      users: [
        {
          id: 'u1',
          email: 'a@x.com',
          firstName: 'A',
          lastName: 'B',
          role: 'pm',
          isActive: true,
          joinedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    workspaceMemberRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          user_id: 'u1',
          workspace_id: 'ws1',
          workspace_name: 'Workspace One',
          role: 'workspace_member',
        },
      ]),
    });

    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.getUsers(req as any, '1', '20');

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].workspaceAccess[0]).toMatchObject({
      workspaceId: 'ws1',
      workspaceName: 'Workspace One',
      accessLevel: 'contributor',
    });
  });

  it('supports empty state for users list', async () => {
    organizationsService.getOrganizationUsers.mockResolvedValue({
      users: [],
      total: 0,
    });
    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.getUsers(req as any, '1', '20');
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('returns role-change contract shape', async () => {
    organizationsService.updateUserRole.mockResolvedValue(undefined);
    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.updateUserRole(req as any, 'u2', {
      role: 'member',
    });
    expect(result.data.userId).toBe('u2');
    expect(result.data.role).toBe('member');
  });

  it('propagates forbidden from role update', async () => {
    organizationsService.updateUserRole.mockRejectedValue(
      new ForbiddenException('Only admins'),
    );
    const req = { user: { id: 'member-1', organizationId: 'org-1', role: 'member' } };
    await expect(
      controller.updateUserRole(req as any, 'u2', { role: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns deactivate contract shape', async () => {
    organizationsService.removeUser.mockResolvedValue(undefined);
    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.deactivateUser(req as any, 'u3', {
      reason: 'Offboarded',
    });
    expect(result.data).toMatchObject({
      userId: 'u3',
      status: 'inactive',
    });
  });
});
