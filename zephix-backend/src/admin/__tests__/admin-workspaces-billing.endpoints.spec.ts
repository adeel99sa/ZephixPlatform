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
import {
  EvaluationDecision,
  GovernanceEvaluation,
} from '../../modules/governance-rules/entities/governance-evaluation.entity';
import { IntegrationConnection } from '../../modules/integrations/entities/integration-connection.entity';
import { AuditEvent } from '../../modules/audit/entities/audit-event.entity';
import { EntitlementService } from '../../modules/billing/entitlements/entitlement.service';

describe('AdminController workspaces and billing endpoints', () => {
  let controller: AdminController;
  const organizationsService = {
    userOrganizationRepository: {
      createQueryBuilder: jest.fn(),
    },
    findOne: jest.fn(),
    getOrganizationUsers: jest.fn(),
  };
  const workspacesService = {
    listByOrg: jest.fn(),
  };
  const attachmentsService = {
    getOrgStorageUsed: jest.fn(),
    getOrgEffectiveUsage: jest.fn(),
  };
  const projectRepo = { createQueryBuilder: jest.fn() };
  const governanceRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: {} },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: TeamsService, useValue: {} },
        { provide: AttachmentsService, useValue: attachmentsService },
        { provide: EntitlementService, useValue: { getLimit: jest.fn().mockResolvedValue(30) } },
        { provide: AuditService, useValue: {} },
        { provide: getRepositoryToken(WorkspaceMember), useValue: {} },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(GovernanceEvaluation), useValue: governanceRepo },
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

  it('returns workspace snapshot with governance metrics', async () => {
    workspacesService.listByOrg.mockResolvedValue([
      { id: 'ws-1', name: 'Workspace A', ownerId: 'owner-1', deletedAt: null },
    ]);
    organizationsService.userOrganizationRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          user_id: 'owner-1',
          email: 'owner@example.com',
          first_name: 'Owner',
          last_name: 'One',
        },
      ]),
    });
    projectRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ workspace_id: 'ws-1', count: 3 }]),
    });
    governanceRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          workspaceId: 'ws-1',
          reasons: [{ code: 'BUDGET_LIMIT' }],
          inputsSnapshot: {},
          decision: EvaluationDecision.WARN,
        },
      ]),
    });

    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.getWorkspaceSnapshot(req as any, '1', '20');

    expect(result.data[0]).toMatchObject({
      workspaceId: 'ws-1',
      workspaceName: 'Workspace A',
      projectCount: 3,
      budgetStatus: 'WARNING',
    });
  });

  it('returns billing summary with real usage fields', async () => {
    organizationsService.findOne.mockResolvedValue({
      planCode: 'enterprise',
      planStatus: 'active',
      planExpiresAt: null,
    });
    organizationsService.getOrganizationUsers.mockResolvedValue({ users: [], total: 5 });
    workspacesService.listByOrg.mockResolvedValue([{ id: 'ws-1' }, { id: 'ws-2' }]);
    attachmentsService.getOrgStorageUsed.mockResolvedValue(1234);

    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.getBillingSummary(req as any);

    expect(result.data.currentPlan).toBe('enterprise');
    expect(result.data.usage).toMatchObject({
      activeUsers: 5,
      workspaces: 2,
      storageBytesUsed: 1234,
    });
  });

  it('returns billing invoices empty-state contract', async () => {
    const result = await controller.getBillingInvoices('1', '20');
    expect(result).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
  });

  it('returns data management summary from source-backed services', async () => {
    organizationsService.findOne.mockResolvedValue({
      settings: { dataRegion: 'us-east-1' },
    });
    attachmentsService.getOrgStorageUsed.mockResolvedValue(2048);
    attachmentsService.getOrgEffectiveUsage.mockResolvedValue(3072);
    const req = { user: { id: 'admin-1', organizationId: 'org-1', role: 'admin' } };
    const result = await controller.getDataManagementSummary(req as any);
    expect(result.data.storage).toMatchObject({
      usedBytes: 2048,
      effectiveBytes: 3072,
    });
    expect(result.data.residency.dataRegion).toBe('us-east-1');
  });

  it('returns data management exports empty-state contract', () => {
    const result = controller.getDataManagementExports();
    expect(result.data).toMatchObject({
      items: [],
      mode: 'read_only',
    });
  });
});
