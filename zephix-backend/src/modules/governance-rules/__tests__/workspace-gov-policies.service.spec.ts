import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { WorkspaceGovPoliciesService } from '../services/workspace-gov-policies.service';
import { WorkspaceGovPolicy } from '../entities/workspace-gov-policy.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { W2_POLICY_CODES } from '../constants/policy-bundle.constants';

const ORG_ID = 'org-1';
const WS_ID = 'ws-1';

function makeWorkspace(complexityMode: string): Partial<Workspace> {
  return { id: WS_ID, name: 'PMO', complexityMode: complexityMode as any };
}

describe('WorkspaceGovPoliciesService', () => {
  let service: WorkspaceGovPoliciesService;
  let repo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock; manager: { query: jest.Mock } };
  let wsRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ ...v, id: 'row-uuid' })),
      // Unit 5: release resolution reads the gate approval chain via manager.query.
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    wsRepo = { findOne: jest.fn().mockResolvedValue(makeWorkspace('governed')) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceGovPoliciesService,
        { provide: getRepositoryToken(WorkspaceGovPolicy), useValue: repo },
        { provide: getRepositoryToken(Workspace), useValue: wsRepo },
      ],
    }).compile();

    service = module.get(WorkspaceGovPoliciesService);
  });

  // ── bundle resolution ─────────────────────────────────────────────────────

  describe('bundle resolution (listPolicies)', () => {
    it('returns all 9 W2 policy codes', async () => {
      const result = await service.listPolicies(ORG_ID, WS_ID);
      expect(result).toHaveLength(W2_POLICY_CODES.length);
      const codes = result.map((p) => p.code);
      for (const code of W2_POLICY_CODES) {
        expect(codes).toContain(code);
      }
    });

    it('source=bundle + isEnabled=true for GOVERNED policies under governed workspace', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      repo.find.mockResolvedValue([]); // no explicit rows

      const result = await service.listPolicies(ORG_ID, WS_ID);
      const evidencePolicy = result.find((p) => p.code === 'platform.gate.evidence-required')!;

      expect(evidencePolicy.isEnabled).toBe(true);
      expect(evidencePolicy.source).toBe('bundle');
      expect(evidencePolicy.severityEffective).toBe('BLOCK');
      expect(evidencePolicy.bundleDefaults).toEqual({ LEAN: false, STANDARD: false, GOVERNED: true });
    });

    it('source=disabled + isEnabled=false for GOVERNED-only policy under LEAN workspace', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('lean'));
      repo.find.mockResolvedValue([]);

      const result = await service.listPolicies(ORG_ID, WS_ID);
      const evidencePolicy = result.find((p) => p.code === 'platform.gate.evidence-required')!;

      expect(evidencePolicy.isEnabled).toBe(false);
      expect(evidencePolicy.source).toBe('disabled');
      expect(evidencePolicy.severityEffective).toBeNull();
    });

    it('STANDARD workspace: all 5 transition gates enabled as BLOCK (GATE-MODE-COHERENCE-1)', async () => {
      // Regression: this test previously asserted WARN — codifying the lie.
      // An armed gate hard-refuses task→DONE in EVERY mode; the console must
      // say BLOCK, not advisory. (The two dark policies stay WARN; the criteria
      // policies stay GOVERNED-only.)
      wsRepo.findOne.mockResolvedValue(makeWorkspace('standard'));
      repo.find.mockResolvedValue([]);

      const result = await service.listPolicies(ORG_ID, WS_ID);
      const transitionGates = [
        'platform.gate.init-to-plan',
        'platform.gate.plan-to-exec',
        'platform.gate.exec-to-monitor',
        'platform.gate.monitor-to-closure',
        'platform.gate.closure-to-closed',
      ];
      for (const code of transitionGates) {
        const p = result.find((x) => x.code === code)!;
        expect(p.isEnabled).toBe(true);
        expect(p.severityEffective).toBe('BLOCK');
        expect(p.verdict).toBe('BLOCK');
        expect(p.state).toBe('ENFORCING');
      }
    });

    it('LEAN workspace: transition gates are DISABLED, not ENFORCING (LEAN arms no gates)', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('lean'));
      repo.find.mockResolvedValue([]);
      const result = await service.listPolicies(ORG_ID, WS_ID);
      for (const code of [
        'platform.gate.init-to-plan',
        'platform.gate.plan-to-exec',
        'platform.gate.exec-to-monitor',
        'platform.gate.monitor-to-closure',
        'platform.gate.closure-to-closed',
      ]) {
        const p = result.find((x) => x.code === code)!;
        expect(p.isEnabled).toBe(false);
        expect(p.state).toBe('DISABLED');
        expect(p.verdict).toBeNull();
      }
    });

    it('GOVERNED workspace: transition gates BLOCK + ENFORCING (byte-identical to before)', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      repo.find.mockResolvedValue([]);
      const result = await service.listPolicies(ORG_ID, WS_ID);
      for (const code of [
        'platform.gate.init-to-plan',
        'platform.gate.plan-to-exec',
        'platform.gate.exec-to-monitor',
        'platform.gate.monitor-to-closure',
        'platform.gate.closure-to-closed',
      ]) {
        const p = result.find((x) => x.code === code)!;
        expect(p.verdict).toBe('BLOCK');
        expect(p.state).toBe('ENFORCING');
      }
    });

    it('criteria policies stay GOVERNED-only (unchanged): evidence-required / closeout not enabled in STANDARD', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('standard'));
      repo.find.mockResolvedValue([]);
      const result = await service.listPolicies(ORG_ID, WS_ID);
      for (const code of [
        'platform.gate.evidence-required',
        'platform.gate.closeout-remediation-owner',
      ]) {
        const p = result.find((x) => x.code === code)!;
        expect(p.isEnabled).toBe(false); // still off in STANDARD (honest, isPolicyActive-gated)
      }
    });

    it('explicit workspace row overrides bundle (source=workspace)', async () => {
      repo.find.mockResolvedValue([
        {
          id: 'row-1',
          policyCode: 'platform.gate.evidence-required',
          isEnabled: false, // explicitly disabled despite GOVERNED bundle
          params: null,
        },
      ]);
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));

      const result = await service.listPolicies(ORG_ID, WS_ID);
      const evidencePolicy = result.find((p) => p.code === 'platform.gate.evidence-required')!;

      expect(evidencePolicy.isEnabled).toBe(false);
      expect(evidencePolicy.source).toBe('workspace');
    });

    it('deprecated SIMPLE mode normalizes to LEAN', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('simple'));
      repo.find.mockResolvedValue([]);

      const result = await service.listPolicies(ORG_ID, WS_ID);
      // LEAN has no gate policies enabled by default
      const gatePolicy = result.find((p) => p.code === 'platform.gate.init-to-plan')!;
      expect(gatePolicy.isEnabled).toBe(false);
    });
  });

  // ── replay determinism ────────────────────────────────────────────────────

  describe('replay determinism', () => {
    it('listPolicies called twice returns identical output (no DB side-effects)', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      repo.find.mockResolvedValue([]);

      const r1 = await service.listPolicies(ORG_ID, WS_ID);
      const r2 = await service.listPolicies(ORG_ID, WS_ID);

      expect(r1).toEqual(r2);
      expect(repo.find).toHaveBeenCalledTimes(2); // two separate DB reads, same result
    });
  });

  // ── upsert ────────────────────────────────────────────────────────────────

  describe('upsertPolicy', () => {
    it('creates new row when none exists (with a declared param)', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.upsertPolicy(
        ORG_ID, WS_ID, 'resource-capacity-governance', true,
        { userId: 'actor-1', platformRole: 'ADMIN' }, { max_active_tasks: 20 },
      );

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: ORG_ID,
        workspaceId: WS_ID,
        policyCode: 'resource-capacity-governance',
        isEnabled: true,
        params: { max_active_tasks: 20 },
      }));
      expect(repo.save).toHaveBeenCalled();
      expect(result.source).toBe('workspace');
    });

    it('updates existing row', async () => {
      const existing = {
        id: 'row-1',
        organizationId: ORG_ID,
        workspaceId: WS_ID,
        policyCode: 'platform.gate.evidence-required',
        isEnabled: true,
        params: null,
      };
      repo.findOne.mockResolvedValue(existing);

      await service.upsertPolicy(
        ORG_ID, WS_ID, 'platform.gate.evidence-required', false,
        { userId: 'actor-1', platformRole: 'ADMIN' },
      );

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
    });

    it('rejects unknown policy codes', async () => {
      await expect(
        service.upsertPolicy(ORG_ID, WS_ID, 'totally.unknown.policy', true,
          { userId: 'actor-1', platformRole: 'ADMIN' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Unit 6: param allow-list validation on the write path ───────────────────

  describe('upsertPolicy — param validation (Unit 6)', () => {
    const ACTOR = { userId: 'actor-1', platformRole: 'ADMIN' } as const;

    it('accepts an in-range declared param and persists it', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.upsertPolicy(
        ORG_ID, WS_ID, 'resource-capacity-governance', true, ACTOR,
        { max_active_tasks: 25 },
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ params: { max_active_tasks: 25 } }),
      );
    });

    it('rejects an unknown param key with POLICY_PARAMS_INVALID / POLICY_PARAM_UNKNOWN_KEY', async () => {
      repo.findOne.mockResolvedValue(null);
      expect.assertions(4);
      try {
        await service.upsertPolicy(
          ORG_ID, WS_ID, 'resource-capacity-governance', true, ACTOR,
          { not_a_real_key: 5 },
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const body: any = (e as BadRequestException).getResponse();
        expect(body.code).toBe('POLICY_PARAMS_INVALID');
        expect(body.errors[0].code).toBe('POLICY_PARAM_UNKNOWN_KEY');
      }
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects an out-of-range value with POLICY_PARAM_OUT_OF_RANGE and does not write', async () => {
      repo.findOne.mockResolvedValue(null);
      expect.assertions(2);
      try {
        await service.upsertPolicy(
          ORG_ID, WS_ID, 'resource-capacity-governance', true, ACTOR,
          { max_active_tasks: 9999 },
        );
      } catch (e) {
        const body: any = (e as BadRequestException).getResponse();
        expect(body.errors[0].code).toBe('POLICY_PARAM_OUT_OF_RANGE');
      }
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects a non-integer / non-numeric value with POLICY_PARAM_INVALID_TYPE', async () => {
      repo.findOne.mockResolvedValue(null);
      expect.assertions(1);
      try {
        await service.upsertPolicy(
          ORG_ID, WS_ID, 'resource-capacity-governance', true, ACTOR,
          { max_active_tasks: 'lots' },
        );
      } catch (e) {
        const body: any = (e as BadRequestException).getResponse();
        expect(body.errors[0].code).toBe('POLICY_PARAM_INVALID_TYPE');
      }
    });

    it('empty / absent params validate trivially (no-op, still writes the toggle)', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.upsertPolicy(ORG_ID, WS_ID, 'resource-capacity-governance', true, ACTOR);
      expect(repo.save).toHaveBeenCalled();
      await service.upsertPolicy(ORG_ID, WS_ID, 'resource-capacity-governance', true, ACTOR, {});
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Unit 6: resolveNumericParam (read path for evaluators) ──────────────────

  describe('resolveNumericParam', () => {
    it('returns the stored value when a valid param is present', async () => {
      repo.findOne.mockResolvedValue({ id: 'r1', params: { max_active_tasks: 30 } });
      const v = await service.resolveNumericParam(
        ORG_ID, WS_ID, 'resource-capacity-governance', 'max_active_tasks',
      );
      expect(v).toBe(30);
    });

    it('returns null when no row exists (caller falls back to constant)', async () => {
      repo.findOne.mockResolvedValue(null);
      const v = await service.resolveNumericParam(
        ORG_ID, WS_ID, 'resource-capacity-governance', 'max_active_tasks',
      );
      expect(v).toBeNull();
    });

    it('returns null when the row has no such param (no-op path)', async () => {
      repo.findOne.mockResolvedValue({ id: 'r1', params: {} });
      const v = await service.resolveNumericParam(
        ORG_ID, WS_ID, 'resource-capacity-governance', 'max_active_tasks',
      );
      expect(v).toBeNull();
    });

    it('treats an un-coercible stored value as absent (returns null) rather than trusting it', async () => {
      repo.findOne.mockResolvedValue({ id: 'r1', params: { max_active_tasks: 9999 } });
      const v = await service.resolveNumericParam(
        ORG_ID, WS_ID, 'resource-capacity-governance', 'max_active_tasks',
      );
      expect(v).toBeNull();
    });
  });

  // ── isPolicyActive ────────────────────────────────────────────────────────

  describe('isPolicyActive', () => {
    it('returns true when explicit row with isEnabled=true', async () => {
      repo.findOne.mockResolvedValue({ isEnabled: true });
      const active = await service.isPolicyActive(ORG_ID, WS_ID, 'platform.gate.evidence-required');
      expect(active).toBe(true);
    });

    it('returns false when explicit row with isEnabled=false (workspace opt-out)', async () => {
      repo.findOne.mockResolvedValue({ isEnabled: false });
      const active = await service.isPolicyActive(ORG_ID, WS_ID, 'platform.gate.evidence-required');
      expect(active).toBe(false);
    });

    it('falls back to bundle when no row — GOVERNED bundle includes evidence-required', async () => {
      repo.findOne.mockResolvedValue(null);
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      const active = await service.isPolicyActive(ORG_ID, WS_ID, 'platform.gate.evidence-required');
      expect(active).toBe(true);
    });

    it('returns false when no row and LEAN bundle (policy not in LEAN)', async () => {
      repo.findOne.mockResolvedValue(null);
      wsRepo.findOne.mockResolvedValue(makeWorkspace('lean'));
      const active = await service.isPolicyActive(ORG_ID, WS_ID, 'platform.gate.evidence-required');
      expect(active).toBe(false);
    });

    it('returns false for unknown policy codes', async () => {
      repo.findOne.mockResolvedValue(null);
      const active = await service.isPolicyActive(ORG_ID, WS_ID, 'nonexistent.policy');
      expect(active).toBe(false);
    });
  });

  // ── GOV-FIX-B1 (1.1): isEvaluable honesty primitive ───────────────────────
  describe('isEvaluable — never faked true', () => {
    it('false for the two non-evaluable promotions, true for the rest', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      const views = await service.listPolicies(ORG_ID, WS_ID);
      const byCode = new Map(views.map((v) => [v.code, v]));
      expect(byCode.get('risk-threshold-alert')!.isEvaluable).toBe(false);
      expect(byCode.get('resource-capacity-governance')!.isEvaluable).toBe(false);
      expect(byCode.get('platform.gate.evidence-required')!.isEvaluable).toBe(true);
    });

    it('a promotion enabled by the GOVERNED bundle is enabled BUT not evaluable', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      repo.find.mockResolvedValue([]);
      const views = await service.listPolicies(ORG_ID, WS_ID);
      const risk = views.find((v) => v.code === 'risk-threshold-alert')!;
      expect(risk.isEnabled).toBe(true); // bundle-enabled under GOVERNED
      expect(risk.isEvaluable).toBe(false); // cannot enforce — honest
      expect(risk.enforcementPoint).toContain('not yet supplied');
    });

    it('surfaces the self-describing fields per code', async () => {
      const [v] = await service.listPolicies(ORG_ID, WS_ID);
      expect(v).toEqual(
        expect.objectContaining({
          code: expect.any(String),
          humanLabel: expect.any(String),
          description: expect.any(String),
          enforcementPoint: expect.any(String),
          source: expect.any(String),
          enabled: expect.any(Boolean),
          isEvaluable: expect.any(Boolean),
        }),
      );
    });
  });

  // ── GOV-FIX-B1 (1.2): resolved-active count includes bundle defaults ───────
  describe('getPolicySummary — count includes bundle defaults', () => {
    it('GOVERNED with ZERO explicit rows counts bundle defaults (the bug case)', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      repo.find.mockResolvedValue([]); // exactly the org-wide reality: no rows
      const s = await service.getPolicySummary(ORG_ID, WS_ID);
      expect(s.activeCount).toBe(9); // all GOVERNED defaults on
      expect(s.evaluableActiveCount).toBe(7); // minus the 2 non-evaluable
      expect(s.total).toBe(9);
    });

    it('LEAN has zero active (all bundle defaults false)', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('lean'));
      repo.find.mockResolvedValue([]);
      const s = await service.getPolicySummary(ORG_ID, WS_ID);
      expect(s.activeCount).toBe(0);
      expect(s.evaluableActiveCount).toBe(0);
    });

    it('an explicit disable override reduces the count below the GOVERNED default', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('governed'));
      repo.find.mockResolvedValue([
        {
          policyCode: 'platform.gate.evidence-required',
          isEnabled: false,
          params: null,
        },
      ]);
      const s = await service.getPolicySummary(ORG_ID, WS_ID);
      expect(s.activeCount).toBe(8); // 9 defaults minus the one explicitly off
    });
  });
});

// ── SKIP-1 (Type A) — workspace_policy toggle receipt ────────────────────────
describe('SKIP-1 (Type A) — upsertPolicy toggle receipt', () => {
  const CODE = 'platform.gate.evidence-required';
  const ACTOR = { userId: 'admin-9', platformRole: 'ADMIN' };

  const makeRepo = (existing: any) => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: 'row-uuid' })),
  });
  const wsRepo = { findOne: jest.fn().mockResolvedValue({ id: WS_ID, complexityMode: 'governed' }) };
  const makeAudit = () => ({ record: jest.fn().mockResolvedValue({}) });

  it('creating a policy row records the actor (updatedBy) + a toggle audit', async () => {
    const repo = makeRepo(null);
    const audit = makeAudit();
    const svc = new WorkspaceGovPoliciesService(repo as any, wsRepo as any, audit as any);

    await svc.upsertPolicy(ORG_ID, WS_ID, CODE, true, ACTOR);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true, updatedBy: 'admin-9' }),
    );
    expect(audit.record).toHaveBeenCalledTimes(1);
    const row = audit.record.mock.calls[0][0];
    expect(row.actorUserId).toBe('admin-9');
    expect(row.metadata.governanceType).toBe('WORKSPACE_POLICY_TOGGLED');
    expect(row.metadata.policyCode).toBe(CODE);
    expect(row.before.isEnabled).toBeNull();
    expect(row.after.isEnabled).toBe(true);
  });

  it('flipping an existing row true→false emits one audit with before/after', async () => {
    const repo = makeRepo({ id: 'r1', organizationId: ORG_ID, workspaceId: WS_ID, policyCode: CODE, isEnabled: true, params: null });
    const audit = makeAudit();
    const svc = new WorkspaceGovPoliciesService(repo as any, wsRepo as any, audit as any);

    await svc.upsertPolicy(ORG_ID, WS_ID, CODE, false, ACTOR);

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false, updatedBy: 'admin-9' }));
    expect(audit.record).toHaveBeenCalledTimes(1);
    const row = audit.record.mock.calls[0][0];
    expect(row.before.isEnabled).toBe(true);
    expect(row.after.isEnabled).toBe(false);
  });

  it('idempotent re-toggle to the same value emits NO audit row', async () => {
    const repo = makeRepo({ id: 'r1', organizationId: ORG_ID, workspaceId: WS_ID, policyCode: CODE, isEnabled: false, params: null });
    const audit = makeAudit();
    const svc = new WorkspaceGovPoliciesService(repo as any, wsRepo as any, audit as any);

    await svc.upsertPolicy(ORG_ID, WS_ID, CODE, false, ACTOR);

    expect(audit.record).not.toHaveBeenCalled();
  });

  it('missing actor platform role → throws, no write of an actor-less state change', async () => {
    const repo = makeRepo(null);
    const audit = makeAudit();
    const svc = new WorkspaceGovPoliciesService(repo as any, wsRepo as any, audit as any);

    await expect(
      svc.upsertPolicy(ORG_ID, WS_ID, CODE, true, { userId: 'x', platformRole: '' }),
    ).rejects.toThrow(/POLICY_TOGGLE_AUDIT_ACTOR_MISSING|platform role/i);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GOV-BUILD WAVE-1 Unit 5 — policy read contract (sentence view)
// ─────────────────────────────────────────────────────────────────────────────
describe('Unit 5 — policy read contract', () => {
  const ORG = 'org-5';
  const WS = 'ws-5';

  function build(opts?: {
    complexityMode?: string;
    rows?: any[];
    chainRows?: any[];
    wsName?: string;
  }) {
    const repo: any = {
      find: jest.fn().mockResolvedValue(opts?.rows ?? []),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ ...v, id: 'r' })),
      manager: { query: jest.fn().mockResolvedValue(opts?.chainRows ?? []) },
    };
    const wsRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: WS,
        name: opts?.wsName ?? 'PMO',
        complexityMode: opts?.complexityMode ?? 'governed',
      }),
    };
    return new WorkspaceGovPoliciesService(repo as any, wsRepo as any, undefined);
  }

  it('the two dark policies return state NOT_EVALUABLE with an engine-naming reason', async () => {
    const views = await build().listPolicies(ORG, WS);
    const risk = views.find((v) => v.code === 'risk-threshold-alert')!;
    const cap = views.find((v) => v.code === 'resource-capacity-governance')!;
    expect(risk.state).toBe('NOT_EVALUABLE');
    expect(risk.stateReason).toMatch(/risk engine/i);
    expect(cap.state).toBe('NOT_EVALUABLE');
    expect(cap.stateReason).toMatch(/capacity engine/i);
  });

  it('an enabled evaluable gate policy under GOVERNED is ENFORCING', async () => {
    const views = await build({ complexityMode: 'governed' }).listPolicies(ORG, WS);
    const gate = views.find((v) => v.code === 'platform.gate.evidence-required')!;
    expect(gate.isEvaluable).toBe(true);
    expect(gate.isEnabled).toBe(true);
    expect(gate.state).toBe('ENFORCING');
    expect(gate.stateReason).toBeNull();
  });

  it('DISABLED distinguishes admin opt-out from bundle-default-off', async () => {
    // explicit workspace row isEnabled=false → "Turned off by your admin"
    const optedOut = await build({
      complexityMode: 'governed',
      rows: [{ policyCode: 'platform.gate.evidence-required', isEnabled: false, params: null }],
    }).listPolicies(ORG, WS);
    const off = optedOut.find((v) => v.code === 'platform.gate.evidence-required')!;
    expect(off.state).toBe('DISABLED');
    expect(off.stateReason).toMatch(/admin/i);

    // no row + LEAN bundle (gate not in LEAN) → bundle-default-off reason
    const lean = await build({ complexityMode: 'lean' }).listPolicies(ORG, WS);
    const leanOff = lean.find((v) => v.code === 'platform.gate.evidence-required')!;
    expect(leanOff.state).toBe('DISABLED');
    expect(leanOff.stateReason).toMatch(/bundle/i);
  });

  it('editable reflects Unit 6: capacity param is editable:false while NOT_EVALUABLE (even though wired)', async () => {
    const views = await build().listPolicies(ORG, WS);
    const cap = views.find((v) => v.code === 'resource-capacity-governance')!;
    expect(cap.when.params).toHaveLength(1);
    expect(cap.when.params[0].key).toBe('max_active_tasks');
    expect(cap.when.params[0].value).toBe(15); // default effective value
    expect(cap.when.params[0].editable).toBe(false);
  });

  it('INVARIANT: state===NOT_EVALUABLE ⇒ every param editable:false', async () => {
    const views = await build().listPolicies(ORG, WS);
    for (const v of views) {
      if (v.state === 'NOT_EVALUABLE') {
        for (const p of v.when.params) expect(p.editable).toBe(false);
      }
    }
  });

  it('when.text is composed server-side and interpolates the threshold', async () => {
    const views = await build().listPolicies(ORG, WS);
    const cap = views.find((v) => v.code === 'resource-capacity-governance')!;
    expect(cap.when.text).toBeTruthy();
    expect(cap.when.text).toContain('15');
    expect(cap.when.text).toContain('tasks');
    expect(cap.when.text).not.toContain('{value}');
  });

  it('scope is a workspace-tier object labelled with the workspace name', async () => {
    const views = await build({ wsName: 'Platform Ops' }).listPolicies(ORG, WS);
    expect(views[0].scope.tier).toBe('workspace');
    expect(views[0].scope.label).toBe('Workspace — Platform Ops');
  });

  it('release is null when verdict is not BLOCK (WARN policy)', async () => {
    const views = await build({ complexityMode: 'governed' }).listPolicies(ORG, WS);
    const risk = views.find((v) => v.code === 'risk-threshold-alert')!;
    expect(risk.verdict).toBe('WARN');
    expect(risk.release).toBeNull();
  });

  it('release is read from the gate chain for a BLOCK policy (faithful, not hardcoded)', async () => {
    const views = await build({
      complexityMode: 'governed',
      chainRows: [
        {
          gate_key: 'platform.gate.plan-to-exec',
          required_role: 'ADMIN',
          min_approvals: 1,
          approval_type: 'ANY_ONE',
        },
      ],
    }).listPolicies(ORG, WS);
    const gate = views.find((v) => v.code === 'platform.gate.plan-to-exec')!;
    expect(gate.verdict).toBe('BLOCK');
    expect(gate.release).toEqual({
      requiredRole: 'ADMIN',
      approvalsRequired: 1,
      label: expect.stringContaining('ADMIN'),
    });
  });

  it('release stays null for a BLOCK policy with no provisioned chain (honest, not fabricated)', async () => {
    const views = await build({ complexityMode: 'governed', chainRows: [] }).listPolicies(ORG, WS);
    const gate = views.find((v) => v.code === 'platform.gate.plan-to-exec')!;
    expect(gate.verdict).toBe('BLOCK');
    expect(gate.release).toBeNull();
  });
});
