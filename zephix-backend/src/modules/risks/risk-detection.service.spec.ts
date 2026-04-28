import { RiskDetectionService } from './risk-detection.service';
import { RiskSeverity } from '../work-management/entities/work-risk.entity';

const activeProject = {
  id: 'project-1',
  organizationId: 'org-1',
  workspaceId: 'workspace-1',
};

function makeQb(result: unknown[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

describe('RiskDetectionService canonical WorkRisk writer', () => {
  let service: RiskDetectionService;
  let allocationRepo: { qb: jest.Mock };
  let taskRepo: { find: jest.Mock };
  let workRisksService: { upsertSystemRisk: jest.Mock };
  let loggerWarn: jest.SpyInstance;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    allocationRepo = { qb: jest.fn() };
    taskRepo = { find: jest.fn().mockResolvedValue([]) };
    workRisksService = {
      upsertSystemRisk: jest.fn().mockResolvedValue({
        action: 'created',
        risk: { id: 'risk-1' },
      }),
    };

    service = new RiskDetectionService(
      {} as any,
      taskRepo as any,
      allocationRepo as any,
      { runJobWithTenant: jest.fn() } as any,
      { getRepository: jest.fn() } as any,
      workRisksService as any,
    );

    loggerWarn = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation();
    loggerError = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation();
    jest.spyOn((service as any).logger, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes resource overallocation detections to work_risks', async () => {
    allocationRepo.qb.mockReturnValue(
      makeQb([
        {
          allocationPercentage: 125,
          resource: { id: 'resource-1', name: 'Alex' },
        },
      ]),
    );

    const count = await service.scanProjectRisks(activeProject as any);

    expect(count).toBe(1);
    expect(workRisksService.upsertSystemRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        source: 'cron_detection',
        riskType: 'resource_overallocation',
        severity: RiskSeverity.HIGH,
        evidence: expect.objectContaining({
          type: 'resource_overallocation',
        }),
      }),
    );
  });

  it('writes timeline slippage detections to work_risks', async () => {
    allocationRepo.qb.mockReturnValue(makeQb([]));
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    taskRepo.find.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Late task',
        dueDate: oldDate,
        status: 'in_progress',
        progressPercentage: 20,
      },
    ]);

    const count = await service.scanProjectRisks(activeProject as any);

    expect(count).toBe(1);
    expect(workRisksService.upsertSystemRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        riskType: 'timeline_slippage',
        severity: RiskSeverity.MEDIUM,
      }),
    );
  });

  it('writes dependency cascade detections to work_risks', async () => {
    allocationRepo.qb.mockReturnValue(makeQb([]));
    taskRepo.find.mockResolvedValue([
      { id: 'blocker-1', title: 'Blocker 1', status: 'in_progress' },
      { id: 'blocker-2', title: 'Blocker 2', status: 'in_progress' },
      { id: 'blocker-3', title: 'Blocker 3', status: 'in_progress' },
      {
        id: 'task-1',
        title: 'Blocked 1',
        status: 'todo',
        dependencies: ['blocker-1'],
      },
      {
        id: 'task-2',
        title: 'Blocked 2',
        status: 'todo',
        dependencies: ['blocker-2'],
      },
      {
        id: 'task-3',
        title: 'Blocked 3',
        status: 'todo',
        dependencies: ['blocker-3'],
      },
      {
        id: 'task-4',
        title: 'Blocked 4',
        status: 'todo',
        dependencies: ['blocker-1'],
      },
    ]);

    const count = await service.scanProjectRisks(activeProject as any);

    expect(count).toBe(1);
    expect(workRisksService.upsertSystemRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        riskType: 'dependency_cascade',
        severity: RiskSeverity.HIGH,
      }),
    );
  });

  it('skips projects without workspace context', async () => {
    const count = await service.scanProjectRisks({
      id: 'project-1',
      organizationId: 'org-1',
      workspaceId: null,
    } as any);

    expect(count).toBe(0);
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'risk_detection.skip_project_without_workspace',
      }),
    );
    expect(workRisksService.upsertSystemRisk).not.toHaveBeenCalled();
  });

  it('logs failed risk creation and continues scanning other detections', async () => {
    allocationRepo.qb.mockReturnValue(
      makeQb([{ allocationPercentage: 130, resource: { name: 'Alex' } }]),
    );
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    taskRepo.find.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Late task',
        dueDate: oldDate,
        status: 'in_progress',
      },
    ]);
    workRisksService.upsertSystemRisk
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce({ action: 'created', risk: { id: 'risk-2' } });

    const count = await service.scanProjectRisks(activeProject as any);

    expect(count).toBe(2);
    expect(workRisksService.upsertSystemRisk).toHaveBeenCalledTimes(2);
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'risk_detection.upsert_failed',
        riskType: 'resource_overallocation',
      }),
    );
  });
});
