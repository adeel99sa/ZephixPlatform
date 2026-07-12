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
  return { id: WS_ID, complexityMode: complexityMode as any };
}

describe('WorkspaceGovPoliciesService', () => {
  let service: WorkspaceGovPoliciesService;
  let repo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let wsRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ ...v, id: 'row-uuid' })),
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

    it('STANDARD workspace: init-to-plan and plan-to-exec enabled as WARN', async () => {
      wsRepo.findOne.mockResolvedValue(makeWorkspace('standard'));
      repo.find.mockResolvedValue([]);

      const result = await service.listPolicies(ORG_ID, WS_ID);
      const initPlan = result.find((p) => p.code === 'platform.gate.init-to-plan')!;
      const planExec = result.find((p) => p.code === 'platform.gate.plan-to-exec')!;

      expect(initPlan.isEnabled).toBe(true);
      expect(initPlan.severityEffective).toBe('WARN');
      expect(planExec.isEnabled).toBe(true);
      expect(planExec.severityEffective).toBe('WARN');
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
    it('creates new row when none exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.upsertPolicy(
        ORG_ID, WS_ID, 'platform.gate.evidence-required', true, { minEvidence: 1 },
      );

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: ORG_ID,
        workspaceId: WS_ID,
        policyCode: 'platform.gate.evidence-required',
        isEnabled: true,
        params: { minEvidence: 1 },
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

      await service.upsertPolicy(ORG_ID, WS_ID, 'platform.gate.evidence-required', false);

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
    });

    it('rejects unknown policy codes', async () => {
      await expect(
        service.upsertPolicy(ORG_ID, WS_ID, 'totally.unknown.policy', true),
      ).rejects.toThrow(BadRequestException);
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
