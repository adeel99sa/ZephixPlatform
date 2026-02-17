import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { KpiComputeStatusController } from '../controllers/kpi-compute-status.controller';
import { KpiEnqueueService } from '../services/kpi-enqueue.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { ProjectKpiValueEntity } from '../../kpis/entities/project-kpi-value.entity';

describe('KpiComputeStatusController', () => {
  let controller: KpiComputeStatusController;
  let mockEnqueueService: any;
  let mockRoleGuard: any;
  let mockKpiValueRepo: any;

  const WS_ID = '00000000-0000-0000-0000-000000000001';
  const PROJ_ID = '00000000-0000-0000-0000-000000000002';
  const USER_ID = '00000000-0000-0000-0000-000000000003';

  const makeReq = (userId = USER_ID) => ({
    user: { id: userId, organizationId: 'org-1' },
  });

  beforeEach(async () => {
    mockEnqueueService = {
      getJobStatus: jest.fn().mockResolvedValue({ pending: false, jobId: null }),
    };
    mockRoleGuard = {
      requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
    };
    mockKpiValueRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KpiComputeStatusController],
      providers: [
        { provide: KpiEnqueueService, useValue: mockEnqueueService },
        { provide: WorkspaceRoleGuardService, useValue: mockRoleGuard },
        { provide: getRepositoryToken(ProjectKpiValueEntity), useValue: mockKpiValueRepo },
      ],
    }).compile();

    controller = module.get(KpiComputeStatusController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus — workspace member', () => {
    it('returns 200 status for workspace member', async () => {
      const result = await controller.getStatus(WS_ID, PROJ_ID, {}, makeReq());
      expect(mockRoleGuard.requireWorkspaceRead).toHaveBeenCalledWith(WS_ID, USER_ID);
      expect(result).toEqual({
        pending: false,
        jobId: null,
        lastComputedAt: {},
        lastFailure: null,
      });
    });

    it('returns lastComputedAt per KPI code', async () => {
      const ts = new Date('2026-02-16T12:00:00Z');
      mockKpiValueRepo.find.mockResolvedValue([
        {
          kpiDefinition: { code: 'throughput' },
          kpiDefinitionId: 'kd-1',
          computedAt: ts,
        },
      ]);
      const result = await controller.getStatus(WS_ID, PROJ_ID, {}, makeReq());
      expect(result.lastComputedAt).toEqual({
        throughput: ts.toISOString(),
      });
    });
  });

  describe('getStatus — authorization', () => {
    it('rejects non-member with 403', async () => {
      mockRoleGuard.requireWorkspaceRead.mockRejectedValue(
        new ForbiddenException({ code: 'FORBIDDEN_ROLE', message: 'Read only access' }),
      );
      await expect(
        controller.getStatus(WS_ID, PROJ_ID, {}, makeReq()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects unauthenticated request', async () => {
      const badReq = { user: undefined };
      await expect(
        controller.getStatus(WS_ID, PROJ_ID, {}, badReq as any),
      ).rejects.toThrow();
    });
  });
});
