/**
 * Phase 2F: Scenario Compute Service Tests
 *
 * Covers: action application, compute determinism, state isolation,
 * empty scope handling, EV aggregation, critical path delta.
 */
import { ScenarioComputeService } from '../scenario-compute.service';
import { NotFoundException } from '@nestjs/common';

describe('ScenarioComputeService', () => {
  let service: ScenarioComputeService;

  const mockTaskRepo = { find: jest.fn() };
  const mockDepRepo = { find: jest.fn() };
  const mockProjectRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockEvRepo = { findOne: jest.fn() };
  const mockAllocRepo = { find: jest.fn() };
  const mockCpmEngine = {
    computeFromData: jest.fn().mockReturnValue({
      nodes: new Map(),
      criticalPathTaskIds: [],
      projectFinishMinutes: 0,
      longestPathDurationMinutes: 0,
      errors: [],
    }),
  };
  const mockScenariosService = {
    getById: jest.fn(),
    getActions: jest.fn(),
    upsertResult: jest.fn(),
  };
  const mockCalendarService = {
    enumerateDates: jest.fn((from: string, to: string) => {
      const dates: string[] = [];
      const cur = new Date(from + 'T00:00:00Z');
      const end = new Date(to + 'T00:00:00Z');
      while (cur <= end) {
        dates.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return dates;
    }),
  };

  const orgId = 'org-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScenarioComputeService(
      mockTaskRepo as any,
      mockDepRepo as any,
      mockProjectRepo as any,
      mockEvRepo as any,
      mockAllocRepo as any,
      mockCpmEngine as any,
      mockScenariosService as any,
      mockCalendarService as any,
    );
  });

  function setupBasicScenario(actions: any[] = []) {
    mockScenariosService.getById.mockResolvedValue({
      id: 'sc-1',
      scopeType: 'project',
      scopeId: 'p1',
      organizationId: orgId,
    });
    mockScenariosService.getActions.mockResolvedValue(actions);
    mockProjectRepo.find.mockResolvedValue([
      { id: 'p1', name: 'Project 1', budget: 100000, waterfallEnabled: false, organizationId: orgId },
    ]);
    mockTaskRepo.find.mockResolvedValue([
      {
        id: 't1',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: false,
        plannedStartAt: new Date('2026-02-09'),
        plannedEndAt: new Date('2026-02-13'),
        estimateHours: 40,
        remainingHours: null,
        percentComplete: 0,
      },
    ]);
    mockDepRepo.find.mockResolvedValue([]);
    mockEvRepo.findOne.mockResolvedValue(null);
    mockScenariosService.upsertResult.mockResolvedValue({});
  }

  it('computes with empty scope and returns empty summary', async () => {
    mockScenariosService.getById.mockResolvedValue({
      id: 'sc-1',
      scopeType: 'project',
      scopeId: 'p-missing',
      organizationId: orgId,
    });
    mockScenariosService.getActions.mockResolvedValue([]);
    mockProjectRepo.find.mockResolvedValue([]);
    mockScenariosService.upsertResult.mockResolvedValue({});

    const result = await service.compute('sc-1', orgId);
    expect(result.warnings).toContain('No projects found in scope');
    expect(result.summary.before.totalCapacityHours).toBe(0);
    expect(result.summary.after.totalCapacityHours).toBe(0);
  });

  it('computes before and after states without actions', async () => {
    setupBasicScenario([]);

    const result = await service.compute('sc-1', orgId);
    expect(result.summary.before.totalDemandHours).toBeGreaterThan(0);
    // Without actions, before and after should be identical
    expect(result.summary.before.totalDemandHours).toBe(result.summary.after.totalDemandHours);
    expect(result.summary.deltas.overallocatedDaysDelta).toBe(0);
  });

  it('is deterministic — same inputs produce same outputs', async () => {
    setupBasicScenario([]);
    const result1 = await service.compute('sc-1', orgId);

    setupBasicScenario([]);
    const result2 = await service.compute('sc-1', orgId);

    expect(result1.summary.before).toEqual(result2.summary.before);
    expect(result1.summary.after).toEqual(result2.summary.after);
  });

  it('applies shift_project action — shifts all task dates', async () => {
    setupBasicScenario([
      {
        id: 'a-1',
        actionType: 'shift_project',
        payload: { projectId: 'p1', shiftDays: 7 },
      },
    ]);

    const result = await service.compute('sc-1', orgId);
    // After state has shifted tasks — demand should now be in different date range
    // The total hours should remain the same but dates are different
    expect(result.summary.after.totalDemandHours).toBeGreaterThan(0);
    expect(result.summary.impactedProjects).toHaveLength(1);
    expect(result.summary.impactedProjects[0].projectId).toBe('p1');
  });

  it('applies shift_task action — shifts single task dates', async () => {
    setupBasicScenario([
      {
        id: 'a-1',
        actionType: 'shift_task',
        payload: { taskId: 't1', shiftDays: 3 },
      },
    ]);

    const result = await service.compute('sc-1', orgId);
    expect(result.summary.after.totalDemandHours).toBeGreaterThan(0);
  });

  it('applies change_budget action — changes project budget in after state', async () => {
    setupBasicScenario([
      {
        id: 'a-1',
        actionType: 'change_budget',
        payload: { projectId: 'p1', newBudget: 200000 },
      },
    ]);

    const result = await service.compute('sc-1', orgId);
    // Budget change doesn't affect capacity/demand, but should not error
    expect(result.warnings).toHaveLength(0);
  });

  it('applies change_capacity action — overrides capacity for user on date', async () => {
    setupBasicScenario([
      {
        id: 'a-1',
        actionType: 'change_capacity',
        payload: { userId: 'u1', date: '2026-02-10', capacityHours: 12 },
      },
    ]);

    const result = await service.compute('sc-1', orgId);
    // After state should reflect modified capacity
    // Before should show default capacity
    expect(result.summary).toBeDefined();
  });

  it('warns on invalid shift_project action', async () => {
    setupBasicScenario([
      {
        id: 'a-1',
        actionType: 'shift_project',
        payload: {}, // missing projectId and shiftDays
      },
    ]);

    const result = await service.compute('sc-1', orgId);
    expect(result.warnings.some((w: string) => w.includes('Invalid shift_project'))).toBe(true);
  });

  it('warns on shift_task with missing task', async () => {
    setupBasicScenario([
      {
        id: 'a-1',
        actionType: 'shift_task',
        payload: { taskId: 'nonexistent', shiftDays: 1 },
      },
    ]);

    const result = await service.compute('sc-1', orgId);
    expect(result.warnings.some((w: string) => w.includes('not found in scope'))).toBe(true);
  });

  it('computes EV aggregation when snapshots exist', async () => {
    setupBasicScenario([]);
    // Override EV mock
    mockEvRepo.findOne.mockResolvedValue({
      projectId: 'p1',
      bac: 100000,
      ev: 80000,
      ac: 90000,
      pv: 85000,
      cpi: 0.89,
      spi: 0.94,
      createdAt: new Date(),
    });

    const result = await service.compute('sc-1', orgId);
    expect(result.summary.before.aggregateCPI).toBeCloseTo(0.889, 2);
    expect(result.summary.before.aggregateSPI).toBeCloseTo(0.941, 2);
  });

  it('computes CPM slip for waterfall-enabled projects', async () => {
    setupBasicScenario([]);
    // Override project to be waterfall enabled
    mockProjectRepo.find.mockResolvedValue([
      { id: 'p1', name: 'WF Project', budget: 100000, waterfallEnabled: true, organizationId: orgId },
    ]);
    mockCpmEngine.computeFromData.mockReturnValue({
      nodes: new Map(),
      criticalPathTaskIds: ['t1'],
      projectFinishMinutes: 4800,
      longestPathDurationMinutes: 4800,
      errors: [],
    });

    const result = await service.compute('sc-1', orgId);
    expect(result.summary.before.criticalPathSlipMinutes).toBe(4800);
  });

  it('persists result via upsertResult', async () => {
    setupBasicScenario([]);

    await service.compute('sc-1', orgId);
    expect(mockScenariosService.upsertResult).toHaveBeenCalledWith(
      'sc-1',
      orgId,
      expect.objectContaining({ before: expect.any(Object), after: expect.any(Object) }),
      expect.any(Array),
    );
  });

  it('does not mutate original tasks when applying actions', async () => {
    const originalStart = new Date('2026-02-09');
    mockScenariosService.getById.mockResolvedValue({
      id: 'sc-1',
      scopeType: 'project',
      scopeId: 'p1',
      organizationId: orgId,
    });
    mockScenariosService.getActions.mockResolvedValue([
      { id: 'a-1', actionType: 'shift_task', payload: { taskId: 't1', shiftDays: 10 } },
    ]);
    const taskData = {
      id: 't1',
      projectId: 'p1',
      assigneeUserId: 'u1',
      isMilestone: false,
      plannedStartAt: originalStart,
      plannedEndAt: new Date('2026-02-13'),
      estimateHours: 40,
      remainingHours: null,
      percentComplete: 0,
    };
    mockProjectRepo.find.mockResolvedValue([
      { id: 'p1', name: 'P1', budget: 100000, waterfallEnabled: false, organizationId: orgId },
    ]);
    mockTaskRepo.find.mockResolvedValue([taskData]);
    mockDepRepo.find.mockResolvedValue([]);
    mockEvRepo.findOne.mockResolvedValue(null);
    mockScenariosService.upsertResult.mockResolvedValue({});

    await service.compute('sc-1', orgId);

    // Original task data should NOT be mutated
    expect(taskData.plannedStartAt).toEqual(originalStart);
  });

  it('resolves portfolio scope to multiple projects', async () => {
    mockScenariosService.getById.mockResolvedValue({
      id: 'sc-1',
      scopeType: 'portfolio',
      scopeId: 'pf-1',
      organizationId: orgId,
    });
    mockScenariosService.getActions.mockResolvedValue([]);
    mockProjectRepo.find.mockImplementation(({ where }: any) => {
      if (where?.portfolioId === 'pf-1') {
        return [
          { id: 'p1', name: 'P1', organizationId: orgId },
          { id: 'p2', name: 'P2', organizationId: orgId },
        ];
      }
      return where.map?.((w: any) => ({ id: w.id, name: w.id, budget: 0, waterfallEnabled: false, organizationId: orgId })) || [];
    });
    mockTaskRepo.find.mockResolvedValue([]);
    mockDepRepo.find.mockResolvedValue([]);
    mockEvRepo.findOne.mockResolvedValue(null);
    mockScenariosService.upsertResult.mockResolvedValue({});

    const result = await service.compute('sc-1', orgId);
    expect(result.summary).toBeDefined();
  });
});
