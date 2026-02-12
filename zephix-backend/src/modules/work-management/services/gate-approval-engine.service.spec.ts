import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GateApprovalEngineService } from './gate-approval-engine.service';
import { GateApprovalChain } from '../entities/gate-approval-chain.entity';
import { GateApprovalChainStep, ApprovalType } from '../entities/gate-approval-chain-step.entity';
import { GateApprovalDecision, ApprovalDecision } from '../entities/gate-approval-decision.entity';
import { PhaseGateSubmission, GateSubmissionStatus } from '../entities/phase-gate-submission.entity';
import { TaskActivityService } from './task-activity.service';
import { PoliciesService } from '../../policies/services/policies.service';
import { GateApprovalChainService } from './gate-approval-chain.service';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const WS_ID = '00000000-0000-0000-0000-000000000002';
const USER_A = '00000000-0000-0000-0000-000000000010'; // submitter
const USER_B = '00000000-0000-0000-0000-000000000011'; // approver 1
const USER_C = '00000000-0000-0000-0000-000000000012'; // approver 2
const SUBMISSION_ID = '00000000-0000-0000-0000-000000000100';
const GATE_DEF_ID = '00000000-0000-0000-0000-000000000200';
const CHAIN_ID = '00000000-0000-0000-0000-000000000300';
const STEP_1_ID = '00000000-0000-0000-0000-000000000301';
const STEP_2_ID = '00000000-0000-0000-0000-000000000302';

function makeSubmission(overrides: Partial<PhaseGateSubmission> = {}): PhaseGateSubmission {
  return {
    id: SUBMISSION_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    projectId: 'project-1',
    phaseId: 'phase-1',
    gateDefinitionId: GATE_DEF_ID,
    status: GateSubmissionStatus.SUBMITTED,
    submittedByUserId: USER_A,
    submittedAt: new Date('2026-02-01T00:00:00Z'),
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

function makeStep(
  overrides: Partial<GateApprovalChainStep> = {},
): GateApprovalChainStep {
  return {
    id: STEP_1_ID,
    organizationId: ORG_ID,
    chainId: CHAIN_ID,
    stepOrder: 1,
    name: 'PM Review',
    description: null,
    requiredRole: 'ADMIN',
    requiredUserId: null,
    approvalType: ApprovalType.ANY_ONE,
    minApprovals: 1,
    autoApproveAfterHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    chain: null as any,
    ...overrides,
  };
}

function makeChain(steps: GateApprovalChainStep[] = []): GateApprovalChain {
  return {
    id: CHAIN_ID,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    gateDefinitionId: GATE_DEF_ID,
    name: 'Test Chain',
    description: null,
    isActive: true,
    createdByUserId: USER_A,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    steps,
  };
}

describe('GateApprovalEngineService', () => {
  let engine: GateApprovalEngineService;
  let decisionRepo: Record<string, jest.Mock>;
  let stepRepo: Record<string, jest.Mock>;
  let submissionRepo: Record<string, jest.Mock>;
  let chainRepo: Record<string, jest.Mock>;
  let activityService: Record<string, jest.Mock>;
  let policiesService: Record<string, jest.Mock>;
  let chainService: Record<string, jest.Mock>;

  const step1 = makeStep({ id: STEP_1_ID, stepOrder: 1, name: 'PM Review' });
  const step2 = makeStep({ id: STEP_2_ID, stepOrder: 2, name: 'Finance Review' });

  beforeEach(async () => {
    decisionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ ...data, id: `decision-${Date.now()}` })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    stepRepo = {
      findOne: jest.fn(),
    };
    submissionRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    chainRepo = {};
    activityService = {
      record: jest.fn().mockResolvedValue({ id: 'activity-1' }),
    };
    policiesService = {
      resolvePolicy: jest.fn().mockResolvedValue(null),
    };
    chainService = {
      getChainForGateDefinition: jest.fn(),
      getChainById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateApprovalEngineService,
        { provide: getRepositoryToken(GateApprovalChain), useValue: chainRepo },
        { provide: getRepositoryToken(GateApprovalChainStep), useValue: stepRepo },
        { provide: getRepositoryToken(GateApprovalDecision), useValue: decisionRepo },
        { provide: getRepositoryToken(PhaseGateSubmission), useValue: submissionRepo },
        { provide: TaskActivityService, useValue: activityService },
        { provide: PoliciesService, useValue: policiesService },
        { provide: GateApprovalChainService, useValue: chainService },
      ],
    }).compile();

    engine = module.get(GateApprovalEngineService);
  });

  describe('activateChainOnSubmission', () => {
    it('should return null when no chain configured (backward compat)', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(null);

      const result = await engine.activateChainOnSubmission(
        { organizationId: ORG_ID, userId: USER_A },
        WS_ID,
        SUBMISSION_ID,
      );

      expect(result).toBeNull();
    });

    it('should activate step 1 and emit activity', async () => {
      const chain = makeChain([step1, step2]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);

      const result = await engine.activateChainOnSubmission(
        { organizationId: ORG_ID, userId: USER_A },
        WS_ID,
        SUBMISSION_ID,
      );

      expect(activityService.record).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: ORG_ID }),
        WS_ID,
        null,
        'GATE_APPROVAL_STEP_ACTIVATED',
        expect.objectContaining({
          submissionId: SUBMISSION_ID,
          stepId: STEP_1_ID,
          stepOrder: 1,
        }),
      );
      expect(result).toBeDefined();
      expect(result!.chainId).toBe(CHAIN_ID);
    });
  });

  describe('approveStep — ANY_ONE mode', () => {
    const authB = { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' };

    it('should complete step on first approval', async () => {
      const chain = makeChain([step1]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      stepRepo.findOne.mockResolvedValue(step1);
      decisionRepo.findOne.mockResolvedValue(null); // no existing decision

      // After recording decision, chain is completed (1 step, ANY_ONE, 1 approval)
      decisionRepo.find
        .mockResolvedValueOnce([]) // initial state check
        .mockResolvedValueOnce([
          {
            id: 'd1',
            chainStepId: STEP_1_ID,
            decidedByUserId: USER_B,
            decision: ApprovalDecision.APPROVED,
            note: null,
            decidedAt: new Date(),
            submissionId: SUBMISSION_ID,
            organizationId: ORG_ID,
          },
        ]); // after recording

      const result = await engine.approveStep(authB, WS_ID, SUBMISSION_ID, 'Looks good');

      expect(activityService.record).toHaveBeenCalledWith(
        authB,
        WS_ID,
        null,
        'GATE_APPROVAL_STEP_APPROVED',
        expect.objectContaining({ decision: 'APPROVED' }),
      );
    });
  });

  describe('approveStep — ALL mode', () => {
    const allStep = makeStep({
      id: STEP_1_ID,
      approvalType: ApprovalType.ALL,
      minApprovals: 2,
      requiredRole: 'ADMIN',
    });

    it('should not complete step until min approvals reached', async () => {
      const chain = makeChain([allStep]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      stepRepo.findOne.mockResolvedValue(allStep);
      decisionRepo.findOne.mockResolvedValue(null);

      // Only 1 approval so far — not enough for ALL with minApprovals=2
      decisionRepo.find
        .mockResolvedValueOnce([]) // initial
        .mockResolvedValueOnce([
          {
            id: 'd1',
            chainStepId: STEP_1_ID,
            decidedByUserId: USER_B,
            decision: ApprovalDecision.APPROVED,
            note: null,
            decidedAt: new Date(),
            submissionId: SUBMISSION_ID,
            organizationId: ORG_ID,
          },
        ]); // after recording

      const result = await engine.approveStep(
        { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
        WS_ID,
        SUBMISSION_ID,
      );

      expect(result.chainStatus).toBe('IN_PROGRESS');
    });

    it('should complete step when all approvals are in', async () => {
      const chain = makeChain([allStep]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      stepRepo.findOne.mockResolvedValue(allStep);
      decisionRepo.findOne.mockResolvedValue(null);

      // 2 approvals — meets minApprovals=2
      const twoApprovals = [
        {
          id: 'd1',
          chainStepId: STEP_1_ID,
          decidedByUserId: USER_B,
          decision: ApprovalDecision.APPROVED,
          note: null,
          decidedAt: new Date(),
          submissionId: SUBMISSION_ID,
          organizationId: ORG_ID,
        },
        {
          id: 'd2',
          chainStepId: STEP_1_ID,
          decidedByUserId: USER_C,
          decision: ApprovalDecision.APPROVED,
          note: null,
          decidedAt: new Date(),
          submissionId: SUBMISSION_ID,
          organizationId: ORG_ID,
        },
      ];

      decisionRepo.find
        .mockResolvedValueOnce([twoApprovals[0]]) // initial — 1 existing approval
        .mockResolvedValueOnce(twoApprovals); // after recording second

      const result = await engine.approveStep(
        { organizationId: ORG_ID, userId: USER_C, platformRole: 'ADMIN' },
        WS_ID,
        SUBMISSION_ID,
      );

      expect(result.chainStatus).toBe('COMPLETED');
      // Verify chain completed activity was emitted
      expect(activityService.record).toHaveBeenCalledWith(
        expect.anything(),
        WS_ID,
        null,
        'GATE_APPROVAL_CHAIN_COMPLETED',
        expect.objectContaining({ submissionId: SUBMISSION_ID }),
      );
    });
  });

  describe('self-approval prevention', () => {
    it('should prevent submitter from approving', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission({ submittedByUserId: USER_A }));
      chainService.getChainForGateDefinition.mockResolvedValue(makeChain([step1]));
      chainService.getChainById.mockResolvedValue(makeChain([step1]));

      await expect(
        engine.approveStep(
          { organizationId: ORG_ID, userId: USER_A, platformRole: 'ADMIN' },
          WS_ID,
          SUBMISSION_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow submitter to reject (not self-approval)', async () => {
      const chain = makeChain([step1]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission({ submittedByUserId: USER_A }));
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      stepRepo.findOne.mockResolvedValue(step1);
      decisionRepo.findOne.mockResolvedValue(null);
      decisionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'd1',
            chainStepId: STEP_1_ID,
            decidedByUserId: USER_A,
            decision: ApprovalDecision.REJECTED,
            note: 'Cannot proceed',
            decidedAt: new Date(),
            submissionId: SUBMISSION_ID,
            organizationId: ORG_ID,
          },
        ]);

      // Should NOT throw — rejection is allowed by submitter
      const result = await engine.rejectStep(
        { organizationId: ORG_ID, userId: USER_A, platformRole: 'ADMIN' },
        WS_ID,
        SUBMISSION_ID,
        'Cannot proceed',
      );

      expect(result.chainStatus).toBe('REJECTED');
    });
  });

  describe('rejectStep', () => {
    it('should reject step and mark chain as REJECTED', async () => {
      const chain = makeChain([step1, step2]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      stepRepo.findOne.mockResolvedValue(step1);
      decisionRepo.findOne.mockResolvedValue(null);
      decisionRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'd1',
            chainStepId: STEP_1_ID,
            decidedByUserId: USER_B,
            decision: ApprovalDecision.REJECTED,
            note: 'Not ready',
            decidedAt: new Date(),
            submissionId: SUBMISSION_ID,
            organizationId: ORG_ID,
          },
        ]);

      const result = await engine.rejectStep(
        { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
        WS_ID,
        SUBMISSION_ID,
        'Not ready',
      );

      expect(result.chainStatus).toBe('REJECTED');
      // Verify submission was rejected
      expect(submissionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GateSubmissionStatus.REJECTED }),
      );
    });
  });

  describe('idempotency', () => {
    it('should not create duplicate decision on double submit', async () => {
      const chain = makeChain([step1]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);

      // Chain shows COMPLETED because step already has approval from USER_B
      decisionRepo.find.mockResolvedValue([
        {
          id: 'd1',
          chainStepId: STEP_1_ID,
          decidedByUserId: USER_B,
          decision: ApprovalDecision.APPROVED,
          note: null,
          decidedAt: new Date(),
          submissionId: SUBMISSION_ID,
          organizationId: ORG_ID,
        },
      ]);

      // Idempotency guard: user's existing decision found
      decisionRepo.findOne.mockResolvedValue({
        id: 'd1',
        submissionId: SUBMISSION_ID,
        chainStepId: STEP_1_ID,
        decidedByUserId: USER_B,
        decision: ApprovalDecision.APPROVED,
      });

      const result = await engine.approveStep(
        { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
        WS_ID,
        SUBMISSION_ID,
      );

      // Should not save a new decision — returned idempotently
      expect(decisionRepo.save).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.chainStatus).toBe('COMPLETED');
    });
  });

  describe('sequential step activation', () => {
    it('should activate next step after current step completes', async () => {
      const chain = makeChain([step1, step2]);
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      stepRepo.findOne.mockResolvedValue(step1);
      decisionRepo.findOne.mockResolvedValue(null);

      // After approving step 1: step 1 has approval, step 2 becomes active
      decisionRepo.find
        .mockResolvedValueOnce([]) // initial state — step 1 active
        .mockResolvedValueOnce([
          {
            id: 'd1',
            chainStepId: STEP_1_ID,
            decidedByUserId: USER_B,
            decision: ApprovalDecision.APPROVED,
            note: null,
            decidedAt: new Date(),
            submissionId: SUBMISSION_ID,
            organizationId: ORG_ID,
          },
        ]); // after decision — step 1 approved

      const result = await engine.approveStep(
        { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
        WS_ID,
        SUBMISSION_ID,
      );

      expect(result.chainStatus).toBe('IN_PROGRESS');
      expect(result.activeStepId).toBe(STEP_2_ID);

      // Should have emitted step activated for step 2
      expect(activityService.record).toHaveBeenCalledWith(
        expect.anything(),
        WS_ID,
        null,
        'GATE_APPROVAL_STEP_ACTIVATED',
        expect.objectContaining({ stepId: STEP_2_ID }),
      );
    });
  });

  describe('escalation', () => {
    it('should escalate overdue steps', async () => {
      policiesService.resolvePolicy.mockResolvedValue(24); // 24 hours
      const oldSubmission = makeSubmission({
        submittedAt: new Date('2026-01-01T00:00:00Z'), // very old
      });
      submissionRepo.find.mockResolvedValue([oldSubmission]);
      const chain = makeChain([step1]);
      chainService.getChainForGateDefinition.mockResolvedValue(chain);
      chainService.getChainById.mockResolvedValue(chain);
      decisionRepo.find.mockResolvedValue([]); // no decisions

      const result = await engine.checkAndEscalateOverdueSteps(
        { organizationId: ORG_ID, userId: USER_A },
        WS_ID,
      );

      expect(result.escalatedCount).toBe(1);
      expect(activityService.record).toHaveBeenCalledWith(
        expect.anything(),
        WS_ID,
        null,
        'GATE_APPROVAL_ESCALATED',
        expect.objectContaining({ escalationHours: 24 }),
      );
    });

    it('should not escalate when policy disabled', async () => {
      policiesService.resolvePolicy.mockResolvedValue(null);

      const result = await engine.checkAndEscalateOverdueSteps(
        { organizationId: ORG_ID, userId: USER_A },
        WS_ID,
      );

      expect(result.escalatedCount).toBe(0);
    });
  });

  describe('tenancy enforcement', () => {
    it('should reject when submission not found (cross-org)', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        engine.approveStep(
          { organizationId: 'other-org', userId: USER_B, platformRole: 'ADMIN' },
          WS_ID,
          SUBMISSION_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when submission not found (cross-workspace)', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        engine.approveStep(
          { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
          'other-ws',
          SUBMISSION_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submission state guards', () => {
    it('should reject approval on non-SUBMITTED submission', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.DRAFT }),
      );
      chainService.getChainForGateDefinition.mockResolvedValue(makeChain([step1]));

      await expect(
        engine.approveStep(
          { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
          WS_ID,
          SUBMISSION_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approval on already APPROVED submission', async () => {
      submissionRepo.findOne.mockResolvedValue(
        makeSubmission({ status: GateSubmissionStatus.APPROVED }),
      );
      chainService.getChainForGateDefinition.mockResolvedValue(makeChain([step1]));

      await expect(
        engine.approveStep(
          { organizationId: ORG_ID, userId: USER_B, platformRole: 'ADMIN' },
          WS_ID,
          SUBMISSION_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
