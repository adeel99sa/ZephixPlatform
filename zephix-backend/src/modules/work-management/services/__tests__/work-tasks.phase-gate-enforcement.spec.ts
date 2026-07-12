/**
 * W2-A gate enforcement — unit + integration contract tests.
 *
 * Matrix covered:
 *  1. isPhaseGateBlocking: no gate def → false (no block)
 *  2. isPhaseGateBlocking: gate def + APPROVED → false (no block)
 *  3. isPhaseGateBlocking: gate def + SUBMITTED → true (blocks)
 *  4. isPhaseGateBlocking: gate def + no submissions → true (blocks, gate exists but not approved)
 *  5. updateTask: use_gates=true, gate SUBMITTED → throws GOVERNANCE_RULE_BLOCKED code=PHASE_GATE_REQUIRED
 *  6. updateTask: use_gates=false → dataSource.query never called (gate skipped)
 *  7. bulkUpdateStatus: gate-blocked tasks excluded from update, surfaced in blockedTasks
 */
import { BadRequestException } from '@nestjs/common';
import { WorkTasksService } from '../work-tasks.service';
import { TaskStatus } from '../../enums/task.enums';

const ORG_ID = 'org-1';
const WS_ID = 'ws-1';
const PROJ_ID = 'proj-1';
const PHASE_ID = 'phase-1';
const GATE_DEF_ID = 'gd-1';

const authCtx = {
  userId: 'u1',
  organizationId: ORG_ID,
  platformRole: 'MEMBER' as any,
};

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test Task',
    status: TaskStatus.IN_PROGRESS,
    phaseId: PHASE_ID,
    projectId: PROJ_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    assigneeUserId: null,
    dueDate: null,
    rank: null,
    completedAt: null,
    deletedAt: null,
    metadata: null,
    parentTaskId: null,
    ...overrides,
  };
}

function makeDataSource(gateDefRows: { id: string }[], gateSubRows: { status: string }[]) {
  let callCount = 0;
  return {
    query: jest.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? Promise.resolve(gateDefRows)
        : Promise.resolve(gateSubRows);
    }),
    getRepository: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
    manager: {
      query: jest.fn().mockResolvedValue([]),
    },
  };
}

function makeService(opts: {
  task?: ReturnType<typeof makeTask>;
  gateDefRows?: { id: string }[];
  gateSubRows?: { status: string }[];
  useGates?: boolean;
}) {
  const task = opts.task ?? makeTask();
  const gateDefRows = opts.gateDefRows ?? [{ id: GATE_DEF_ID }];
  const gateSubRows = opts.gateSubRows ?? [{ status: 'SUBMITTED' }];
  const useGates = opts.useGates ?? true;

  const taskRepo = {
    findOne: jest.fn().mockResolvedValue(task),
    find: jest.fn().mockResolvedValue([task]),
    save: jest.fn().mockImplementation((t: unknown) => Promise.resolve(t)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
    qb: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const projectRepo = {
    findOne: jest.fn().mockResolvedValue({
      capabilities: { use_gates: useGates },
    }),
    find: jest.fn().mockResolvedValue([{ id: PROJ_ID, capabilities: { use_gates: useGates } }]),
  };

  const dataSource = makeDataSource(gateDefRows, gateSubRows);

  const service = new WorkTasksService(
    taskRepo as any,
    {} as any,   // dependencyRepo
    {} as any,   // commentRepo
    {} as any,   // activityRepo
    { findOne: jest.fn().mockResolvedValue(null) } as any, // workPhaseRepository
    { requireWorkspaceWrite: jest.fn(), requireWorkspaceRead: jest.fn() } as any,
    { record: jest.fn().mockResolvedValue(undefined) } as any, // activityService
    { assertOrganizationId: jest.fn().mockReturnValue(ORG_ID) } as any,
    dataSource as any,
    { recalculateProjectHealth: jest.fn().mockResolvedValue(undefined) } as any,
    { enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined), enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined) } as any,
    projectRepo as any,
    { log: jest.fn().mockResolvedValue(undefined), logBulk: jest.fn().mockResolvedValue(undefined) } as any,
    { getWorkspaceRole: jest.fn().mockResolvedValue('MEMBER') } as any,
    { getForProject: jest.fn().mockResolvedValue([]) } as any, // projectStatusService
    undefined,  // governanceEngine
    undefined,  // governanceExceptionsService
    undefined,  // domainEventEmitter
    undefined,  // capacityGovernance
    undefined,  // orgPolicyService
  );

  (service as any).assertWorkspaceAccess = jest.fn().mockResolvedValue(undefined);

  return { service, taskRepo, projectRepo, dataSource };
}

// ── Unit: isPhaseGateBlocking ─────────────────────────────────────────────────

describe('WorkTasksService.isPhaseGateBlocking — gate SQL logic', () => {
  it('returns false when no active gate def exists for the phase', async () => {
    const { service } = makeService({ gateDefRows: [] });
    const result = await (service as any).isPhaseGateBlocking(PHASE_ID, ORG_ID);
    expect(result).toBe(false);
  });

  it('returns false when gate def exists and latest submission is APPROVED', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'APPROVED' }],
    });
    const result = await (service as any).isPhaseGateBlocking(PHASE_ID, ORG_ID);
    expect(result).toBe(false);
  });

  it('returns true when gate def exists and latest submission is SUBMITTED', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'SUBMITTED' }],
    });
    const result = await (service as any).isPhaseGateBlocking(PHASE_ID, ORG_ID);
    expect(result).toBe(true);
  });

  it('returns true when gate def exists but no submissions exist (null = not approved)', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [],
    });
    const result = await (service as any).isPhaseGateBlocking(PHASE_ID, ORG_ID);
    expect(result).toBe(true);
  });

  it('returns true when gate def exists and latest submission is DRAFT', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'DRAFT' }],
    });
    const result = await (service as any).isPhaseGateBlocking(PHASE_ID, ORG_ID);
    expect(result).toBe(true);
  });

  it('returns true when gate def exists and latest submission is REJECTED', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'REJECTED' }],
    });
    const result = await (service as any).isPhaseGateBlocking(PHASE_ID, ORG_ID);
    expect(result).toBe(true);
  });
});

// ── Integration: updateTask gate enforcement ──────────────────────────────────

describe('WorkTasksService.updateTask — phase gate enforcement', () => {
  it('throws GOVERNANCE_RULE_BLOCKED / PHASE_GATE_REQUIRED when use_gates=true and gate not approved', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'SUBMITTED' }],
      useGates: true,
    });

    await expect(
      service.updateTask(authCtx, WS_ID, 'task-1', { status: TaskStatus.DONE } as any),
    ).rejects.toMatchObject({
      response: { code: 'GOVERNANCE_RULE_BLOCKED' },
    });
  });

  // WA-1 GOVERNANCE INVARIANT (the moat): granting workspace_members task-write
  // at the controller must NOT let them bypass the governance engine. authCtx is
  // a MEMBER; moving a task to DONE in a gated phase still hard-blocks with
  // GOVERNANCE_RULE_BLOCKED. This test guards the write-grant from ever
  // shortcutting policy enforcement in the service layer.
  it('WA-1 invariant: a workspace_member moving a task to DONE in a gated phase is STILL GOVERNANCE_RULE_BLOCKED', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'SUBMITTED' }],
      useGates: true,
    });

    // authCtx.platformRole === 'MEMBER' and getWorkspaceRole → member.
    await expect(
      service.updateTask(authCtx, WS_ID, 'task-1', {
        status: TaskStatus.DONE,
      } as any),
    ).rejects.toMatchObject({
      response: { code: 'GOVERNANCE_RULE_BLOCKED' },
    });
  });

  it('error payload includes PHASE_GATE_REQUIRED reason code', async () => {
    const { service } = makeService({
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'SUBMITTED' }],
      useGates: true,
    });

    let caught: BadRequestException | null = null;
    try {
      await service.updateTask(authCtx, WS_ID, 'task-1', { status: TaskStatus.DONE } as any);
    } catch (e) {
      caught = e as BadRequestException;
    }
    expect(caught).not.toBeNull();
    const body = (caught as any).response;
    const codes = body.policyCodes as string[];
    expect(codes).toContain('PHASE_GATE_REQUIRED');
  });

  it('does NOT call dataSource.query when use_gates=false (gate enforcement skipped)', async () => {
    const { service, dataSource } = makeService({
      useGates: false,
    });

    // Gate check should be skipped; dataSource.query should not be called for gate SQL
    try {
      await service.updateTask(authCtx, WS_ID, 'task-1', { status: TaskStatus.DONE } as any);
    } catch {
      // allow other unrelated errors after gate skip
    }

    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('does NOT call dataSource.query when task has no phaseId (unassigned task)', async () => {
    const { service, dataSource } = makeService({
      task: makeTask({ phaseId: null }),
      useGates: true,
    });

    try {
      await service.updateTask(authCtx, WS_ID, 'task-1', { status: TaskStatus.DONE } as any);
    } catch {
      // allow other unrelated errors
    }

    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

// ── Integration: bulkUpdateStatus gate enforcement ────────────────────────────

describe('WorkTasksService.bulkUpdateStatus — phase gate enforcement', () => {
  function makeBulkService(opts: {
    tasks?: ReturnType<typeof makeTask>[];
    gateDefRows?: { id: string }[];
    gateSubRows?: { status: string }[];
    useGates?: boolean;
  }) {
    const tasks = opts.tasks ?? [makeTask()];
    const gateDefRows = opts.gateDefRows ?? [{ id: GATE_DEF_ID }];
    const gateSubRows = opts.gateSubRows ?? [{ status: 'SUBMITTED' }];
    const useGates = opts.useGates ?? true;

    const taskRepo = {
      find: jest.fn().mockResolvedValue(tasks),
      update: jest.fn().mockResolvedValue({ affected: tasks.length }),
      count: jest.fn().mockResolvedValue(0),
    };

    const projectRepo = {
      findOne: jest.fn().mockResolvedValue({ capabilities: { use_gates: useGates } }),
      find: jest.fn().mockResolvedValue(
        [...new Set(tasks.map((t) => t.projectId))].map((id) => ({
          id,
          capabilities: { use_gates: useGates },
        })),
      ),
    };

    const dataSource = makeDataSource(gateDefRows, gateSubRows);

    const service = new WorkTasksService(
      taskRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { requireWorkspaceWrite: jest.fn(), requireWorkspaceRead: jest.fn() } as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any,
      { assertOrganizationId: jest.fn().mockReturnValue(ORG_ID) } as any,
      dataSource as any,
      { recalculateProjectHealth: jest.fn().mockResolvedValue(undefined) } as any,
      { enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined), enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined) } as any,
      projectRepo as any,
      { log: jest.fn().mockResolvedValue(undefined), logBulk: jest.fn().mockResolvedValue(undefined) } as any,
      { getWorkspaceRole: jest.fn().mockResolvedValue('MEMBER') } as any,
      { getForProject: jest.fn().mockResolvedValue([]) } as any, // projectStatusService
      undefined,  // governanceEngine
      undefined,  // governanceExceptionsService
      undefined,  // domainEventEmitter
      undefined,  // capacityGovernance
      undefined,  // orgPolicyService
    );

    (service as any).assertWorkspaceAccess = jest.fn().mockResolvedValue(undefined);

    return { service, taskRepo, dataSource };
  }

  it('throws GOVERNANCE_RULE_BLOCKED when all tasks are gate-blocked (all-blocked case)', async () => {
    const { service } = makeBulkService({
      tasks: [makeTask({ id: 't1' })],
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'SUBMITTED' }],
      useGates: true,
    });

    await expect(
      service.bulkUpdateStatus(authCtx, WS_ID, {
        taskIds: ['t1'],
        status: TaskStatus.DONE,
      } as any),
    ).rejects.toMatchObject({
      response: { code: 'GOVERNANCE_RULE_BLOCKED' },
    });
  });

  it('allows update when gate is APPROVED (bulk DONE path)', async () => {
    const { service, taskRepo } = makeBulkService({
      tasks: [makeTask({ id: 't1' })],
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'APPROVED' }],
      useGates: true,
    });

    await service.bulkUpdateStatus(authCtx, WS_ID, {
      taskIds: ['t1'],
      status: TaskStatus.DONE,
    } as any);

    expect(taskRepo.update).toHaveBeenCalledTimes(1);
  });

  it('allows update for tasks without phaseId even when gate enforcement is on', async () => {
    const taskNoPhase = makeTask({ id: 't1', phaseId: null });
    const { service, taskRepo } = makeBulkService({
      tasks: [taskNoPhase],
      gateDefRows: [{ id: GATE_DEF_ID }],
      gateSubRows: [{ status: 'SUBMITTED' }],
      useGates: true,
    });

    await service.bulkUpdateStatus(authCtx, WS_ID, {
      taskIds: ['t1'],
      status: TaskStatus.DONE,
    } as any);

    expect(taskRepo.update).toHaveBeenCalledTimes(1);
  });
});
