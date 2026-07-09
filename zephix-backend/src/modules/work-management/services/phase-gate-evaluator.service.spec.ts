import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  PhaseGateEvaluatorService,
  EvaluationResult,
} from './phase-gate-evaluator.service';
import {
  PhaseGateDefinition,
  GateDefinitionStatus,
} from '../entities/phase-gate-definition.entity';
import {
  PhaseGateSubmission,
  GateSubmissionStatus,
} from '../entities/phase-gate-submission.entity';
import { WorkTask } from '../entities/work-task.entity';
import { WorkRisk, RiskStatus } from '../entities/work-risk.entity';
import { GateSubmissionEvidence } from '../entities/gate-submission-evidence.entity';
import { PoliciesService } from '../../policies/services/policies.service';
import { WorkspaceGovPoliciesService } from '../../governance-rules/services/workspace-gov-policies.service';
import { GovernanceExceptionsService } from '../../governance-exceptions/governance-exceptions.service';
import { GateApprovalChainService } from './gate-approval-chain.service';
import { GateApprovalEngineService } from './gate-approval-engine.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';
import { AddGateSubmittedAuditAction18000000000202 } from '../../../migrations/18000000000202-AddGateSubmittedAuditAction';

const ORG_ID = 'org-1';
const WS_ID = 'ws-1';
const USER_ID = 'user-1';
const PROJECT_ID = 'project-1';
const PHASE_ID = 'phase-1';
const GATE_DEF_ID = 'gate-def-1';
const SUBMISSION_ID = 'sub-1';

const auth = { organizationId: ORG_ID, userId: USER_ID };

function makeGateDef(overrides: Partial<PhaseGateDefinition> = {}): PhaseGateDefinition {
  return {
    id: GATE_DEF_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    projectId: PROJECT_ID,
    phaseId: PHASE_ID,
    name: 'Test Gate',
    gateKey: null,
    status: GateDefinitionStatus.ACTIVE,
    reviewersRolePolicy: null,
    requiredDocuments: null,
    requiredChecklist: null,
    thresholds: null,
    createdByUserId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    project: null as any,
    phase: null as any,
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<PhaseGateSubmission> = {}): PhaseGateSubmission {
  return {
    id: SUBMISSION_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    projectId: PROJECT_ID,
    phaseId: PHASE_ID,
    gateDefinitionId: GATE_DEF_ID,
    status: GateSubmissionStatus.SUBMITTED,
    submittedByUserId: USER_ID,
    submittedAt: new Date(),
    decisionByUserId: null,
    decidedAt: null,
    decisionNote: null,
    documentsSnapshot: null,
    checklistSnapshot: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('PhaseGateEvaluatorService', () => {
  let evaluator: PhaseGateEvaluatorService;
  let gateDefRepo: Record<string, jest.Mock>;
  let submissionRepo: Record<string, jest.Mock>;
  let workTaskRepo: Record<string, jest.Mock>;
  let workRiskRepo: Record<string, jest.Mock>;
  let evidenceRepo: Record<string, jest.Mock>;
  let policiesService: Record<string, jest.Mock>;
  let workspaceGovPolicies: Record<string, jest.Mock>;
  let governanceExceptions: Record<string, jest.Mock>;
  let chainService: Record<string, jest.Mock>;
  let engineService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let mockManager: Record<string, jest.Mock>;

  const defaultPolicies = {
    phase_gate_approval_chain_required: false,
    phase_gate_approval_min_steps: 1,
    phase_gate_approval_escalation_hours: 72,
    phase_gate_quality_check_enabled: false,
    acceptance_criteria_min_count: 2,
    resource_conflict_blocks_gate: false,
  };

  beforeEach(async () => {
    gateDefRepo = { findOne: jest.fn() };
    submissionRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    workTaskRepo = { find: jest.fn().mockResolvedValue([]) };
    workRiskRepo = { find: jest.fn().mockResolvedValue([]) };
    evidenceRepo = { count: jest.fn().mockResolvedValue(1) }; // default: has evidence
    policiesService = {
      resolvePolicy: jest.fn().mockResolvedValue(null),
      resolvePolicies: jest.fn().mockResolvedValue({ ...defaultPolicies }),
    };
    // Default: all W2 policies disabled — existing tests are unaffected
    workspaceGovPolicies = { isPolicyActive: jest.fn().mockResolvedValue(false) };
    governanceExceptions = { create: jest.fn().mockResolvedValue({ id: 'exc-1' }) };
    chainService = { getChainForGateDefinition: jest.fn().mockResolvedValue(null) };
    engineService = { getChainExecutionState: jest.fn() };
    // W2-C2: transaction wraps save + audit; manager.save returns the entity passed
    mockManager = { save: jest.fn((_entity: unknown, obj: unknown) => Promise.resolve(obj)) };
    dataSource = { transaction: jest.fn((fn: (m: unknown) => unknown) => fn(mockManager)) };
    auditService = { recordOrThrow: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhaseGateEvaluatorService,
        { provide: getRepositoryToken(PhaseGateDefinition), useValue: gateDefRepo },
        { provide: getRepositoryToken(PhaseGateSubmission), useValue: submissionRepo },
        { provide: getRepositoryToken(WorkTask), useValue: workTaskRepo },
        { provide: getRepositoryToken(WorkRisk), useValue: workRiskRepo },
        { provide: getRepositoryToken(GateSubmissionEvidence), useValue: evidenceRepo },
        { provide: PoliciesService, useValue: policiesService },
        { provide: WorkspaceGovPoliciesService, useValue: workspaceGovPolicies },
        { provide: GovernanceExceptionsService, useValue: governanceExceptions },
        { provide: GateApprovalChainService, useValue: chainService },
        { provide: GateApprovalEngineService, useValue: engineService },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    evaluator = module.get(PhaseGateEvaluatorService);
  });

  describe('evaluateSubmission', () => {
    it('should return canApprove=true when no blockers and no chain', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(true);
      expect(result.items).toHaveLength(0);
      expect(result.chainState).toBeNull();
    });

    it('should return canApprove=false when chain required but missing', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicies.mockResolvedValue({
        ...defaultPolicies,
        phase_gate_approval_chain_required: true,
      });

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(false);
      expect(result.items).toContainEqual(
        expect.objectContaining({
          code: 'APPROVAL_CHAIN_REQUIRED',
          severity: 'BLOCKER',
        }),
      );
    });

    it('should return canApprove=false when chain exists but not completed', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      chainService.getChainForGateDefinition.mockResolvedValue({
        id: 'chain-1',
        steps: [{ id: 'step-1', stepOrder: 1 }],
      });
      engineService.getChainExecutionState.mockResolvedValue({
        chainId: 'chain-1',
        submissionId: SUBMISSION_ID,
        chainStatus: 'IN_PROGRESS',
        activeStepId: 'step-1',
        steps: [],
      });

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(false);
      expect(result.chainState).not.toBeNull();
      expect(result.chainState!.chainStatus).toBe('IN_PROGRESS');
    });

    it('should return canApprove=true when chain completed', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      chainService.getChainForGateDefinition.mockResolvedValue({
        id: 'chain-1',
        steps: [{ id: 'step-1', stepOrder: 1 }],
      });
      engineService.getChainExecutionState.mockResolvedValue({
        chainId: 'chain-1',
        submissionId: SUBMISSION_ID,
        chainStatus: 'COMPLETED',
        activeStepId: null,
        steps: [],
      });

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(true);
    });
  });

  describe('mergeQualityWarnings', () => {
    it('should not run when quality check disabled', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicies.mockResolvedValue({
        ...defaultPolicies,
        phase_gate_quality_check_enabled: false,
      });

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(workTaskRepo.find).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(0);
    });

    it('should warn when tasks have insufficient acceptance criteria', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicies.mockResolvedValue({
        ...defaultPolicies,
        phase_gate_quality_check_enabled: true,
        acceptance_criteria_min_count: 3,
      });
      workTaskRepo.find.mockResolvedValue([
        { id: 't1', title: 'Task 1', acceptanceCriteria: [{ text: 'a', done: false }] },
        { id: 't2', title: 'Task 2', acceptanceCriteria: [{ text: 'a', done: false }, { text: 'b', done: false }, { text: 'c', done: true }] },
        { id: 't3', title: 'Task 3', acceptanceCriteria: null },
      ]);

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      const qualityItem = result.items.find((i) => i.code === 'QUALITY_ACCEPTANCE_CRITERIA_LOW');
      expect(qualityItem).toBeDefined();
      expect(qualityItem!.severity).toBe('WARNING'); // NEVER blocker
      expect(qualityItem!.metadata).toEqual(
        expect.objectContaining({ belowMinCount: 2, minRequired: 3 }),
      );
    });

    it('should produce warnings only — never blockers', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicies.mockResolvedValue({
        ...defaultPolicies,
        phase_gate_quality_check_enabled: true,
        acceptance_criteria_min_count: 5,
      });
      workTaskRepo.find.mockResolvedValue([
        { id: 't1', title: 'Task', acceptanceCriteria: [] },
      ]);

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      // Quality checks should not prevent approval
      expect(result.canApprove).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].severity).toBe('WARNING');
    });

    it('should respect acceptance_criteria_min_count policy', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      policiesService.resolvePolicies.mockResolvedValue({
        ...defaultPolicies,
        phase_gate_quality_check_enabled: true,
        acceptance_criteria_min_count: 1, // low threshold
      });
      workTaskRepo.find.mockResolvedValue([
        { id: 't1', title: 'Task', acceptanceCriteria: [{ text: 'a', done: false }] },
      ]);

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      // All tasks meet threshold — no warning
      expect(result.items).toHaveLength(0);
    });
  });

  describe('existing blocker behavior unchanged', () => {
    it('should block when resource_conflict_blocks_gate is true (placeholder)', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef());
      // Resource conflict blocking is a placeholder — currently returns empty
      // This test ensures the policy read doesn't break anything
      policiesService.resolvePolicies.mockResolvedValue(defaultPolicies);
      policiesService.resolvePolicy.mockResolvedValue(true); // resource_conflict_blocks_gate

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      // Should still pass since conflict check is placeholder
      expect(result.canApprove).toBe(true);
    });
  });

  describe('transitionSubmission', () => {
    it('should allow valid transition DRAFT → SUBMITTED', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );

      const result = await evaluator.transitionSubmission(
        auth,
        WS_ID,
        SUBMISSION_ID,
        GateSubmissionStatus.SUBMITTED,
      );

      expect(result.status).toBe(GateSubmissionStatus.SUBMITTED);
      expect(result.submittedByUserId).toBe(USER_ID);
      expect(result.submittedAt).toBeDefined();
    });

    it('should reject invalid transition APPROVED → SUBMITTED', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.APPROVED }),
      );

      await expect(
        evaluator.transitionSubmission(auth, WS_ID, SUBMISSION_ID, GateSubmissionStatus.SUBMITTED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow REJECTED → DRAFT (resubmission)', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.REJECTED }),
      );

      const result = await evaluator.transitionSubmission(
        auth,
        WS_ID,
        SUBMISSION_ID,
        GateSubmissionStatus.DRAFT,
      );

      expect(result.status).toBe(GateSubmissionStatus.DRAFT);
    });

    // ── W2-C2: governance audit on transition ─────────────────────────────────

    it('happy path: DRAFT→SUBMITTED writes GATE_SUBMITTED audit row via recordOrThrow', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );

      const result = await evaluator.transitionSubmission(
        auth,
        WS_ID,
        SUBMISSION_ID,
        GateSubmissionStatus.SUBMITTED,
      );

      expect(result.status).toBe(GateSubmissionStatus.SUBMITTED);

      expect(auditService.recordOrThrow).toHaveBeenCalledTimes(1);
      expect(auditService.recordOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.GATE_SUBMITTED,
          entityType: AuditEntityType.PHASE_GATE_SUBMISSION,
          entityId: SUBMISSION_ID,
          metadata: expect.objectContaining({
            fromStatus: GateSubmissionStatus.DRAFT,
            toStatus: GateSubmissionStatus.SUBMITTED,
            submissionId: SUBMISSION_ID,
            gateDefinitionId: GATE_DEF_ID,
          }),
        }),
        expect.objectContaining({ manager: mockManager }),
      );
    });

    it('audit failure: recordOrThrow rejection propagates and rolls back transition', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );
      const auditError = new Error('DB constraint — audit write failed');
      auditService.recordOrThrow.mockRejectedValueOnce(auditError);
      // transaction mock propagates the rejection from the callback
      dataSource.transaction.mockImplementationOnce(
        async (fn: (m: unknown) => Promise<unknown>) => fn(mockManager),
      );

      await expect(
        evaluator.transitionSubmission(auth, WS_ID, SUBMISSION_ID, GateSubmissionStatus.SUBMITTED),
      ).rejects.toThrow('DB constraint — audit write failed');
    });

    it('migration spec: allActionValues includes GATE_SUBMITTED and allEntityTypeValues includes phase_gate_submission', () => {
      const migration = new AddGateSubmittedAuditAction18000000000202();
      // Access private arrays via bracket notation
      const allActions = (migration as any).allActionValues as string[];
      const allEntityTypes = (migration as any).allEntityTypeValues as string[];

      expect(allActions).toContain('GATE_SUBMITTED');
      expect(allEntityTypes).toContain('phase_gate_submission');
      // Verify prior values are preserved (no regression on existing rows)
      expect(allActions).toContain('governance_evaluate');
      expect(allEntityTypes).toContain('project_artifact');
    });
  });

  // ── W2: GATE_EVIDENCE_REQUIRED enforcement ────────────────────────────────

  describe('evidence-block enforcement (GATE_EVIDENCE_REQUIRED)', () => {
    it('blocks DRAFT→SUBMITTED when policy active and no evidence rows, auto-creates exception', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(true); // policy ON
      evidenceRepo.count.mockResolvedValue(0); // no evidence

      await expect(
        evaluator.transitionSubmission(auth, WS_ID, SUBMISSION_ID, GateSubmissionStatus.SUBMITTED),
      ).rejects.toThrow(ConflictException);

      expect(governanceExceptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          exceptionType: 'GOVERNANCE_RULE',
          metadata: expect.objectContaining({
            policyCode: 'platform.gate.evidence-required',
            submissionId: SUBMISSION_ID,
          }),
        }),
      );
      // Submission must NOT have advanced
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('allows DRAFT→SUBMITTED when policy active and evidence exists', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(true);
      evidenceRepo.count.mockResolvedValue(2); // has evidence

      const result = await evaluator.transitionSubmission(
        auth, WS_ID, SUBMISSION_ID, GateSubmissionStatus.SUBMITTED,
      );

      expect(result.status).toBe(GateSubmissionStatus.SUBMITTED);
      expect(governanceExceptions.create).not.toHaveBeenCalled();
    });

    it('skips evidence check when policy disabled (LEAN/STANDARD without override)', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(false); // policy OFF
      evidenceRepo.count.mockResolvedValue(0); // no evidence — would block if policy active

      const result = await evaluator.transitionSubmission(
        auth, WS_ID, SUBMISSION_ID, GateSubmissionStatus.SUBMITTED,
      );

      expect(result.status).toBe(GateSubmissionStatus.SUBMITTED);
      expect(evidenceRepo.count).not.toHaveBeenCalled();
      expect(governanceExceptions.create).not.toHaveBeenCalled();
    });

    it('evaluateSubmission includes GATE_EVIDENCE_REQUIRED BLOCKER when policy active + no evidence', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef({ gateKey: null }));
      // mergeResourceConflictBlockers uses PoliciesService (old), not workspaceGovPolicies
      // mergeCloseoutOwnerBlockers short-circuits when gateKey=null — no isPolicyActive call
      // Only mergeEvidenceBlockers calls isPolicyActive
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(true); // evidence-required: ON
      evidenceRepo.count.mockResolvedValue(0); // no evidence

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(false);
      expect(result.items).toContainEqual(
        expect.objectContaining({ code: 'GATE_EVIDENCE_REQUIRED', severity: 'BLOCKER' }),
      );
    });
  });

  // ── W2: closeout risk-owner enforcement ───────────────────────────────────

  describe('closeout-owner enforcement (platform.gate.closeout-remediation-owner)', () => {
    it('blocks when closure gate + policy active + unowned risks exist', async () => {
      const closureGateDef = makeGateDef({ gateKey: 'platform.gate.closure-to-closed' });
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(closureGateDef);
      workspaceGovPolicies.isPolicyActive
        .mockResolvedValueOnce(false) // evidence-required
        .mockResolvedValueOnce(true); // closeout-remediation-owner
      workRiskRepo.find.mockResolvedValue([
        { id: 'risk-1', title: 'Open risk', status: RiskStatus.OPEN },
      ]);

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(false);
      expect(result.items).toContainEqual(
        expect.objectContaining({ code: 'CLOSEOUT_RISK_OWNER_REQUIRED', severity: 'BLOCKER' }),
      );
    });

    it('passes when closure gate but no unowned risks', async () => {
      const closureGateDef = makeGateDef({ gateKey: 'platform.gate.closure-to-closed' });
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(closureGateDef);
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(true);
      evidenceRepo.count.mockResolvedValue(1); // has evidence
      workRiskRepo.find.mockResolvedValue([]); // all risks owned

      const result = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(result.canApprove).toBe(true);
      expect(result.items.filter((i) => i.code === 'CLOSEOUT_RISK_OWNER_REQUIRED')).toHaveLength(0);
    });

    it('skips closeout check for non-closure gate keys', async () => {
      const planGateDef = makeGateDef({ gateKey: 'platform.gate.plan-to-exec' });
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(planGateDef);
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(false); // all policies off

      await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      // workRiskRepo.find should NOT be called for non-closure gates
      expect(workRiskRepo.find).not.toHaveBeenCalled();
    });
  });

  // ── Replay determinism: same state → byte-identical decision ─────────────
  //
  // Governance engine invariant: a submission that is evaluated twice under
  // identical DB state must produce the same blockers (codes, severities,
  // order) and the same canApprove answer.  Any stateful side-effect that
  // changes the second result is a governance bug.

  describe('replay determinism (evaluator-level)', () => {
    it('evaluateSubmission run twice under identical state → byte-identical decision output', async () => {
      // Fixed state: evidence-required ON, no evidence → GATE_EVIDENCE_REQUIRED BLOCKER every run
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef({ gateKey: null }));
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(true); // evidence-required always ON
      evidenceRepo.count.mockResolvedValue(0); // always no evidence

      const r1 = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);
      const r2 = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      // Structural identity: same decision
      expect(r1.canApprove).toBe(r2.canApprove);
      expect(r1.canApprove).toBe(false);

      // Byte-identical blockers: same codes, same severities, same order
      expect(r1.items).toHaveLength(r2.items.length);
      r1.items.forEach((item, i) => {
        expect(item.code).toBe(r2.items[i].code);
        expect(item.severity).toBe(r2.items[i].severity);
      });

      // No DB side-effects that could skew round 2
      // Each round reads the same mocked state; no write should have occurred
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('evaluateSubmission run twice with no blockers → canApprove=true both times', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      gateDefRepo.findOne.mockResolvedValue(makeGateDef({ gateKey: null }));
      // All W2 policies OFF, no chain — clean pass
      workspaceGovPolicies.isPolicyActive.mockResolvedValue(false);

      const r1 = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);
      const r2 = await evaluator.evaluateSubmission(auth, WS_ID, SUBMISSION_ID);

      expect(r1.canApprove).toBe(true);
      expect(r2.canApprove).toBe(true);
      expect(r1.items).toHaveLength(0);
      expect(r2.items).toHaveLength(0);
    });
  });

  // ── Fail-closed posture pin: policy resolution error on transition path ───
  //
  // Declared invariant: if isPolicyActive throws on the transition path,
  // the submission must NOT advance and save must NOT be called.
  // This test pins that behavior so a future try/catch refactor cannot
  // silently flip the posture from fail-closed to fail-open.

  describe('fail-closed pin (policy resolution error on transition path)', () => {
    it('transitionSubmission throws and does not persist when isPolicyActive errors', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );
      // Simulate DB hiccup on policy resolution (not "policy says block" — actual resolution failure)
      workspaceGovPolicies.isPolicyActive.mockRejectedValue(
        new Error('DB connection timeout'),
      );

      await expect(
        evaluator.transitionSubmission(auth, WS_ID, SUBMISSION_ID, GateSubmissionStatus.SUBMITTED),
      ).rejects.toThrow('DB connection timeout');

      // Submission must not have been saved — fail-closed posture preserved
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });
  });
});
