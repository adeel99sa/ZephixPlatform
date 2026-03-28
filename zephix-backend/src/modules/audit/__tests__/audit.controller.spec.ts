import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuditController } from '../controllers/audit.controller';
import { AuditService } from '../services/audit.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const WS_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';

function makeReq(platformRole: string, organizationId = ORG_ID, userId = USER_ID) {
  return {
    user: { id: userId, organizationId, platformRole },
    headers: {},
    ip: '127.0.0.1',
  } as any;
}

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: any;
  let workspaceRoleGuard: any;

  beforeEach(async () => {
    auditService = {
      query: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'evt-1',
            organizationId: ORG_ID,
            workspaceId: WS_ID,
            actorUserId: USER_ID,
            actorPlatformRole: 'ADMIN',
            actorWorkspaceRole: null,
            entityType: 'work_task',
            entityId: 'task-1',
            action: 'update',
            beforeJson: null,
            afterJson: null,
            metadataJson: { source: 'board' },
            createdAt: new Date('2026-01-01'),
          },
        ],
        total: 1,
      }),
    };

    workspaceRoleGuard = {
      getWorkspaceRole: jest.fn().mockResolvedValue('workspace_owner'),
      requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: auditService },
        { provide: WorkspaceRoleGuardService, useValue: workspaceRoleGuard },
      ],
    }).compile();

    controller = module.get(AuditController);
  });

  // ── Workspace-scoped audit ────────────────────────────────────────

  describe('GET /work/workspaces/:wsId/audit', () => {
    it('allows platform ADMIN to view workspace audit', async () => {
      const result = await controller.listWorkspaceAudit(makeReq('ADMIN'), WS_ID);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('allows workspace_owner to view workspace audit', async () => {
      workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('workspace_owner');
      const result = await controller.listWorkspaceAudit(makeReq('MEMBER'), WS_ID);
      expect(result.data.items).toHaveLength(1);
    });

    it('allows delivery_owner to view workspace audit', async () => {
      workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('delivery_owner');
      const result = await controller.listWorkspaceAudit(makeReq('MEMBER'), WS_ID);
      expect(result.data.items).toHaveLength(1);
    });

    it('blocks workspace_member from viewing workspace audit', async () => {
      workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('workspace_member');
      await expect(
        controller.listWorkspaceAudit(makeReq('MEMBER'), WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks workspace_viewer from viewing workspace audit', async () => {
      workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('workspace_viewer');
      await expect(
        controller.listWorkspaceAudit(makeReq('VIEWER'), WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects invalid workspace ID', async () => {
      await expect(
        controller.listWorkspaceAudit(makeReq('ADMIN'), 'not-a-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes pagination params correctly', async () => {
      await controller.listWorkspaceAudit(makeReq('ADMIN'), WS_ID, '2', '25');

      expect(auditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 25,
        }),
      );
    });

    it('clamps pageSize to max 200', async () => {
      await controller.listWorkspaceAudit(makeReq('ADMIN'), WS_ID, '1', '999');

      expect(auditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 200,
        }),
      );
    });

    it('passes filter params to query', async () => {
      await controller.listWorkspaceAudit(
        makeReq('ADMIN'),
        WS_ID,
        '1',
        '50',
        'work_task',
        'task-1',
        'update',
        USER_ID,
        '2026-01-01',
        '2026-12-31',
      );

      expect(auditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          workspaceId: WS_ID,
          entityType: 'work_task',
          entityId: 'task-1',
          action: 'update',
          actorUserId: USER_ID,
          from: '2026-01-01',
          to: '2026-12-31',
        }),
      );
    });

    it('scopes query by organizationId from auth context', async () => {
      await controller.listWorkspaceAudit(makeReq('ADMIN'), WS_ID);

      expect(auditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
        }),
      );
    });
  });

  // ── Org-scoped audit ──────────────────────────────────────────────

  describe('GET /audit/org', () => {
    it('allows platform ADMIN to view org audit', async () => {
      const result = await controller.listOrgAudit(makeReq('ADMIN'));
      expect(result.data.items).toHaveLength(1);
    });

    it('blocks MEMBER from viewing org audit', async () => {
      await expect(
        controller.listOrgAudit(makeReq('MEMBER')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks VIEWER from viewing org audit', async () => {
      await expect(
        controller.listOrgAudit(makeReq('VIEWER')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not include workspaceId in org-scoped query', async () => {
      await controller.listOrgAudit(makeReq('ADMIN'));

      expect(auditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
        }),
      );
      const call = auditService.query.mock.calls[0][0];
      expect(call.workspaceId).toBeUndefined();
    });

    it('returns proper pagination structure', async () => {
      const result = await controller.listOrgAudit(makeReq('ADMIN'), '1', '50');
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('page');
      expect(result.data).toHaveProperty('pageSize');
      expect(result.data).toHaveProperty('total');
    });
  });
});
