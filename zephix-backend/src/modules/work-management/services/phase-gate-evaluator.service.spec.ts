import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
});
