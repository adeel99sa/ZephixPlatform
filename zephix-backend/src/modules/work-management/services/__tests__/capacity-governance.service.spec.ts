import { CapacityGovernanceService } from '../capacity-governance.service';

/**
 * GOV-BUILD WAVE-1 Unit 6 — CapacityGovernanceService reads its active-task
 * threshold from workspace_policies.params (resource-capacity-governance.
 * max_active_tasks), falling back to the constant 15 when absent. The critical
 * assertion is that behaviour is IDENTICAL to before Unit 6 for all current
 * data (no params row → threshold 15), and that an unreachable resolver is loud
 * (WARN) but never a silent disable — it still falls back to the constant.
 */
describe('CapacityGovernanceService — threshold param reads (Unit 6)', () => {
  const baseInput = {
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    assigneeUserId: 'user-1',
    actorUserId: 'actor-1',
    isBulk: false,
  };

  function makeDeps() {
    const taskRepo = { count: jest.fn().mockResolvedValue(0) } as any;
    const projectRepo = { findOne: jest.fn().mockResolvedValue(null) } as any;
    const auditService = { record: jest.fn().mockResolvedValue(undefined) } as any;
    return { taskRepo, projectRepo, auditService };
  }

  it('honours the threshold from resolved params when present', async () => {
    const { taskRepo, projectRepo, auditService } = makeDeps();
    const govPolicies = {
      resolveNumericParam: jest.fn().mockResolvedValue(5),
    } as any;
    const svc = new CapacityGovernanceService(
      taskRepo, projectRepo, auditService, govPolicies,
    );

    const evalResult = await svc.evaluateAssignment(baseInput);

    expect(govPolicies.resolveNumericParam).toHaveBeenCalledWith(
      'org-1', 'ws-1', 'resource-capacity-governance', 'max_active_tasks',
    );
    expect(evalResult.capacityThreshold).toBe(5);
  });

  it('falls back to the constant (15) when no param is set — the no-op path', async () => {
    const { taskRepo, projectRepo, auditService } = makeDeps();
    const govPolicies = {
      resolveNumericParam: jest.fn().mockResolvedValue(null),
    } as any;
    const svc = new CapacityGovernanceService(
      taskRepo, projectRepo, auditService, govPolicies,
    );

    const evalResult = await svc.evaluateAssignment(baseInput);

    expect(evalResult.capacityThreshold).toBe(15);
  });

  it('resolver not injected → WARN + fall back to 15, never throws or silently disables', async () => {
    const { taskRepo, projectRepo, auditService } = makeDeps();
    const svc = new CapacityGovernanceService(
      taskRepo, projectRepo, auditService, undefined,
    );
    const warnSpy = jest
      .spyOn((svc as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const evalResult = await svc.evaluateAssignment(baseInput);

    expect(evalResult.capacityThreshold).toBe(15);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CAPACITY_PARAM_RESOLVER_UNAVAILABLE'),
    );
  });

  it('resolver throws → WARN + fall back to 15, evaluation still returns', async () => {
    const { taskRepo, projectRepo, auditService } = makeDeps();
    const govPolicies = {
      resolveNumericParam: jest.fn().mockRejectedValue(new Error('db down')),
    } as any;
    const svc = new CapacityGovernanceService(
      taskRepo, projectRepo, auditService, govPolicies,
    );
    const warnSpy = jest
      .spyOn((svc as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const evalResult = await svc.evaluateAssignment(baseInput);

    expect(evalResult.capacityThreshold).toBe(15);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CAPACITY_PARAM_RESOLVE_FAILED'),
      expect.anything(),
    );
  });
});
