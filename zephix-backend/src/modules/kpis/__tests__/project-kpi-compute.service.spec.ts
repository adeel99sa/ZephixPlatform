import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectKpiComputeService } from '../services/project-kpi-compute.service';
import { ProjectKpiConfigsService } from '../services/project-kpi-configs.service';
import { ProjectKpiValuesService } from '../services/project-kpi-values.service';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { Iteration } from '../../work-management/entities/iteration.entity';
import { WorkRisk } from '../../work-management/entities/work-risk.entity';
import { ProjectBudgetEntity } from '../../budgets/entities/project-budget.entity';
import { Project } from '../../projects/entities/project.entity';
import { EarnedValueSnapshot } from '../../work-management/entities/earned-value-snapshot.entity';
import { ChangeRequestEntity } from '../../change-requests/entities/change-request.entity';

describe('ProjectKpiComputeService', () => {
  let service: ProjectKpiComputeService;
  let mockConfigsService: any;
  let mockValuesService: any;
  let mockTaskRepo: any;
  let mockRiskRepo: any;
  let mockProjectRepo: any;

  const WS_ID = '00000000-0000-0000-0000-000000000001';
  const PROJ_ID = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    mockConfigsService = {
      getEnabledConfigs: jest.fn().mockResolvedValue([]),
    };
    mockValuesService = {
      upsertValue: jest.fn().mockResolvedValue({ id: 'val-1' }),
    };
    mockTaskRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockRiskRepo = {
      count: jest.fn().mockResolvedValue(0),
    };
    mockProjectRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({
        id: PROJ_ID,
        iterationsEnabled: false,
        costTrackingEnabled: false,
        baselinesEnabled: false,
        earnedValueEnabled: false,
        capacityEnabled: false,
        changeManagementEnabled: false,
      }),
      count: jest.fn().mockResolvedValue(0),
    };

    const emptyRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectKpiComputeService,
        { provide: ProjectKpiConfigsService, useValue: mockConfigsService },
        { provide: ProjectKpiValuesService, useValue: mockValuesService },
        { provide: getRepositoryToken(WorkTask), useValue: mockTaskRepo },
        { provide: getRepositoryToken(Iteration), useValue: emptyRepo },
        { provide: getRepositoryToken(WorkRisk), useValue: mockRiskRepo },
        { provide: getRepositoryToken(ProjectBudgetEntity), useValue: emptyRepo },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: getRepositoryToken(EarnedValueSnapshot), useValue: emptyRepo },
        { provide: getRepositoryToken(ChangeRequestEntity), useValue: emptyRepo },
      ],
    }).compile();

    service = module.get(ProjectKpiComputeService);
  });

  it('returns empty computed and skipped when no KPIs enabled', async () => {
    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(mockValuesService.upsertValue).not.toHaveBeenCalled();
  });

  it('computes wip KPI and includes inputHash in valueJson', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-wip',
        kpiDefinition: { calculationStrategy: 'wip', requiredGovernanceFlag: null, code: 'wip', name: 'WIP' },
      },
    ]);
    mockTaskRepo.find.mockResolvedValue([
      { status: 'IN_PROGRESS', actualStartAt: null, completedAt: null, estimatePoints: null },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(mockValuesService.upsertValue).toHaveBeenCalledWith(
      WS_ID,
      PROJ_ID,
      'def-wip',
      expect.any(String),
      expect.objectContaining({
        valueNumeric: 1,
        valueJson: expect.objectContaining({
          inputHash: expect.any(String),
        }),
      }),
    );
  });

  it('computes open_risk_count KPI', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-risk',
        kpiDefinition: { calculationStrategy: 'open_risk_count', requiredGovernanceFlag: null, code: 'open_risk_count', name: 'Open Risk Count' },
      },
    ]);
    mockRiskRepo.count.mockResolvedValue(3);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
    expect(mockValuesService.upsertValue).toHaveBeenCalledWith(
      WS_ID,
      PROJ_ID,
      'def-risk',
      expect.any(String),
      expect.objectContaining({ valueNumeric: 3 }),
    );
  });

  it('computes escaped_defects placeholder', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-esc',
        kpiDefinition: { calculationStrategy: 'escaped_defects', requiredGovernanceFlag: null, code: 'escaped_defects', name: 'Escaped Defects' },
      },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
  });

  it('skips config without kpiDefinition relation', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      { kpiDefinitionId: 'def-x', kpiDefinition: null },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(0);
    expect(mockValuesService.upsertValue).not.toHaveBeenCalled();
  });

  it('handles unknown calculation strategy gracefully', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-unknown',
        kpiDefinition: { calculationStrategy: 'unknown_strategy', requiredGovernanceFlag: null, code: 'unknown', name: 'Unknown' },
      },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
  });

  // ── Governance flag enforcement: skipped list with reasons ──────────

  it('returns skipped list with reason when governance flag is disabled', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-vel',
        kpiDefinition: {
          calculationStrategy: 'velocity',
          requiredGovernanceFlag: 'iterationsEnabled',
          code: 'velocity',
          name: 'Sprint Velocity',
        },
      },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toEqual({
      kpiCode: 'velocity',
      kpiName: 'Sprint Velocity',
      reason: 'GOVERNANCE_FLAG_DISABLED',
      governanceFlag: 'iterationsEnabled',
    });
    expect(mockValuesService.upsertValue).not.toHaveBeenCalled();
  });

  it('computes KPIs when their governance flag IS enabled', async () => {
    mockProjectRepo.findOne.mockResolvedValue({
      id: PROJ_ID,
      iterationsEnabled: true,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: false,
      changeManagementEnabled: false,
    });

    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-vel',
        kpiDefinition: {
          calculationStrategy: 'velocity',
          requiredGovernanceFlag: 'iterationsEnabled',
          code: 'velocity',
          name: 'Sprint Velocity',
        },
      },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(mockValuesService.upsertValue).toHaveBeenCalled();
  });

  it('splits computed and skipped when mixed governance flags', async () => {
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-wip',
        kpiDefinition: { calculationStrategy: 'wip', requiredGovernanceFlag: null, code: 'wip', name: 'WIP' },
      },
      {
        kpiDefinitionId: 'def-burn',
        kpiDefinition: {
          calculationStrategy: 'budget_burn',
          requiredGovernanceFlag: 'costTrackingEnabled',
          code: 'budget_burn',
          name: 'Budget Burn Rate',
        },
      },
    ]);
    mockTaskRepo.find.mockResolvedValue([
      { status: 'IN_PROGRESS', actualStartAt: null, completedAt: null, estimatePoints: null },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].kpiCode).toBe('budget_burn');
    expect(result.skipped[0].reason).toBe('GOVERNANCE_FLAG_DISABLED');
    expect(result.skipped[0].governanceFlag).toBe('costTrackingEnabled');
    expect(mockValuesService.upsertValue).toHaveBeenCalledTimes(1);
  });

  it('computes change KPIs when changeManagementEnabled is true', async () => {
    mockProjectRepo.findOne.mockResolvedValue({
      id: PROJ_ID,
      iterationsEnabled: false,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: false,
      changeManagementEnabled: true,
    });

    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-cr-rate',
        kpiDefinition: {
          calculationStrategy: 'change_request_approval_rate',
          requiredGovernanceFlag: 'changeManagementEnabled',
          code: 'change_request_approval_rate',
          name: 'CR Approval Rate',
        },
      },
    ]);

    const result = await service.computeForProject(WS_ID, PROJ_ID);
    expect(result.computed).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(mockValuesService.upsertValue).toHaveBeenCalled();
  });

  // ── inputHash determinism ──────────────────────────────────────────

  it('produces same inputHash for same input data', async () => {
    const task = { status: 'IN_PROGRESS', actualStartAt: null, completedAt: null, estimatePoints: null };
    mockConfigsService.getEnabledConfigs.mockResolvedValue([
      {
        kpiDefinitionId: 'def-wip',
        kpiDefinition: { calculationStrategy: 'wip', requiredGovernanceFlag: null, code: 'wip', name: 'WIP' },
      },
    ]);
    mockTaskRepo.find.mockResolvedValue([task]);

    await service.computeForProject(WS_ID, PROJ_ID);
    const firstCall = mockValuesService.upsertValue.mock.calls[0][4];
    const hash1 = firstCall.valueJson?.inputHash;

    mockValuesService.upsertValue.mockClear();
    await service.computeForProject(WS_ID, PROJ_ID);
    const secondCall = mockValuesService.upsertValue.mock.calls[0][4];
    const hash2 = secondCall.valueJson?.inputHash;

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(16);
  });
});
