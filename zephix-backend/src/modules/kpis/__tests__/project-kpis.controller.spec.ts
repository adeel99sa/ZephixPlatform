import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectKpisController } from '../controllers/project-kpis.controller';
import { KpiDefinitionsService } from '../services/kpi-definitions.service';
import { ProjectKpiConfigsService } from '../services/project-kpi-configs.service';
import { ProjectKpiValuesService } from '../services/project-kpi-values.service';
import { ProjectKpiComputeService } from '../services/project-kpi-compute.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { Project } from '../../projects/entities/project.entity';

describe('ProjectKpisController', () => {
  let controller: ProjectKpisController;
  let mockDefinitionsService: any;
  let mockConfigsService: any;
  let mockValuesService: any;
  let mockComputeService: any;
  let mockRoleGuard: any;
  let mockProjectRepo: any;

  const WS_ID = '00000000-0000-0000-0000-000000000001';
  const PROJ_ID = '00000000-0000-0000-0000-000000000002';
  const USER_ID = '00000000-0000-0000-0000-000000000003';
  const ORG_ID = '00000000-0000-0000-0000-000000000004';

  const mockReq = {
    user: { userId: USER_ID, organizationId: ORG_ID },
  };

  beforeEach(async () => {
    mockDefinitionsService = {
      listDefinitions: jest.fn().mockResolvedValue([{ id: 'd1', code: 'wip' }]),
    };
    mockConfigsService = {
      getConfigs: jest.fn().mockResolvedValue([]),
      upsertConfigs: jest.fn().mockResolvedValue([]),
    };
    mockValuesService = {
      getValues: jest.fn().mockResolvedValue([]),
    };
    mockComputeService = {
      computeForProject: jest.fn().mockResolvedValue({ computed: [], skipped: [] }),
    };
    mockRoleGuard = {
      requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
      requireWorkspaceWrite: jest.fn().mockResolvedValue(undefined),
      getWorkspaceRole: jest.fn().mockResolvedValue('workspace_owner'),
    };
    mockProjectRepo = {
      findOne: jest.fn().mockResolvedValue({
        iterationsEnabled: true,
        costTrackingEnabled: false,
        baselinesEnabled: false,
        earnedValueEnabled: false,
        capacityEnabled: false,
        changeManagementEnabled: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectKpisController],
      providers: [
        { provide: KpiDefinitionsService, useValue: mockDefinitionsService },
        { provide: ProjectKpiConfigsService, useValue: mockConfigsService },
        { provide: ProjectKpiValuesService, useValue: mockValuesService },
        { provide: ProjectKpiComputeService, useValue: mockComputeService },
        { provide: WorkspaceRoleGuardService, useValue: mockRoleGuard },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
      ],
    }).compile();

    controller = module.get(ProjectKpisController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDefinitions', () => {
    it('returns definitions after role check', async () => {
      const result = await controller.getDefinitions(WS_ID, mockReq);
      expect(mockRoleGuard.requireWorkspaceRead).toHaveBeenCalledWith(WS_ID, USER_ID);
      expect(result).toEqual({ data: [{ id: 'd1', code: 'wip' }] });
    });
  });

  describe('getConfig', () => {
    it('returns configs for project', async () => {
      const result = await controller.getConfig(WS_ID, PROJ_ID, mockReq);
      expect(mockConfigsService.getConfigs).toHaveBeenCalledWith(WS_ID, PROJ_ID);
      expect(result).toEqual({ data: [] });
    });
  });

  describe('updateConfig', () => {
    it('enforces write access', async () => {
      await controller.updateConfig(
        WS_ID,
        PROJ_ID,
        { items: [{ kpiCode: 'wip', enabled: true }] },
        mockReq,
      );
      expect(mockRoleGuard.requireWorkspaceWrite).toHaveBeenCalledWith(WS_ID, USER_ID);
    });
  });

  describe('compute', () => {
    it('triggers computation and returns computed + skipped', async () => {
      const result = await controller.compute(WS_ID, PROJ_ID, mockReq);
      expect(mockComputeService.computeForProject).toHaveBeenCalledWith(WS_ID, PROJ_ID);
      expect(result).toEqual({ data: { computed: [], skipped: [] } });
    });
  });

  describe('getValues', () => {
    it('returns values for date range', async () => {
      const result = await controller.getValues(
        WS_ID,
        PROJ_ID,
        { from: '2026-01-01', to: '2026-01-31' },
        mockReq,
      );
      expect(mockValuesService.getValues).toHaveBeenCalledWith(
        WS_ID,
        PROJ_ID,
        '2026-01-01',
        '2026-01-31',
      );
      expect(result).toEqual({ data: [] });
    });
  });
});
