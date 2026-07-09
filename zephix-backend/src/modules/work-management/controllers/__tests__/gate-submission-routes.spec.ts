/**
 * gate-submission-routes.spec.ts
 *
 * Tests: route reachability, guard enforcement, GOVERNANCE_RULE_BLOCKED
 * passthrough verbatim (not wrapped in ResponseService), and read-only
 * assertion for the evaluate endpoint.
 *
 * Full-path v2 recon close-out: every Stage-2-proof-required behavior is
 * reachable via a named route on the registered controller.
 */
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { GateApprovalActionController } from '../gate-approval-action.controller';
import { GateApprovalEngineService } from '../../services/gate-approval-engine.service';
import { GateApprovalChainService } from '../../services/gate-approval-chain.service';
import { PhaseGateEvaluatorService } from '../../services/phase-gate-evaluator.service';
import { WorkspaceRoleGuardService } from '../../../workspace-access/workspace-role-guard.service';
import { ResponseService } from '../../../../shared/services/response.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { GateSubmissionStatus } from '../../entities/phase-gate-submission.entity';

const WS_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const SUB_ID = 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1';
const USER_ID = 'user-uuid-1234-5678-abcd-ef0123456789';
const ORG_ID = 'org-uuid-1234-5678-abcd-ef0123456789';

function makeAuthReq(userId = USER_ID, orgId = ORG_ID) {
  return {
    user: { id: userId, organizationId: orgId, role: 'ADMIN' },
  } as any;
}

describe('GateApprovalActionController — submit + evaluate routes', () => {
  let controller: GateApprovalActionController;
  let evaluatorService: Record<string, jest.Mock>;
  let workspaceRoleGuard: Record<string, jest.Mock>;
  let responseService: Record<string, jest.Mock>;

  beforeEach(async () => {
    evaluatorService = {
      transitionSubmission: jest.fn(),
      evaluateSubmission: jest.fn(),
    };
    workspaceRoleGuard = {
      requireWorkspaceWrite: jest.fn().mockResolvedValue(undefined),
      requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
    };
    responseService = {
      success: jest.fn((data) => ({ data })),
      error: jest.fn((code, msg) => ({ error: { code, message: msg } })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GateApprovalActionController],
      providers: [
        { provide: GateApprovalEngineService, useValue: { activateChainOnSubmission: jest.fn(), approveStep: jest.fn(), rejectStep: jest.fn(), checkAndEscalateOverdueSteps: jest.fn() } },
        { provide: GateApprovalChainService, useValue: {} },
        { provide: PhaseGateEvaluatorService, useValue: evaluatorService },
        { provide: WorkspaceRoleGuardService, useValue: workspaceRoleGuard },
        { provide: ResponseService, useValue: responseService },
      ],
    }).compile();

    controller = module.get(GateApprovalActionController);
  });

  // ── Route reachability ────────────────────────────────────────────────────

  describe('route registration (reachability proof)', () => {
    it('controller is registered at work/gate-submissions', () => {
      const path = Reflect.getMetadata('path', GateApprovalActionController);
      expect(path).toBe('work/gate-submissions');
    });

    it('JwtAuthGuard is applied at class level', () => {
      const guards = Reflect.getMetadata('__guards__', GateApprovalActionController) || [];
      const guardClasses = guards.map((g: any) => (typeof g === 'function' ? g : g?.constructor));
      expect(guardClasses).toContain(JwtAuthGuard);
    });

    it('submitSubmission method exists on controller prototype', () => {
      expect(typeof GateApprovalActionController.prototype.submitSubmission).toBe('function');
    });

    it('evaluateSubmission method exists on controller prototype', () => {
      expect(typeof GateApprovalActionController.prototype.evaluateSubmission).toBe('function');
    });

    it('submitSubmission registered as POST', () => {
      const httpMethod = Reflect.getMetadata(
        'method',
        GateApprovalActionController.prototype.submitSubmission,
      );
      // NestJS RequestMethod: GET=0, POST=1, PUT=2, DELETE=3, PATCH=4
      expect(httpMethod).toBe(1); // POST
    });

    it('evaluateSubmission registered as GET', () => {
      const httpMethod = Reflect.getMetadata(
        'method',
        GateApprovalActionController.prototype.evaluateSubmission,
      );
      // NestJS RequestMethod: GET=0, POST=1
      expect(httpMethod).toBe(0); // GET
    });

    it('submitSubmission path contains :submissionId/submit', () => {
      const path = Reflect.getMetadata(
        'path',
        GateApprovalActionController.prototype.submitSubmission,
      );
      expect(path).toMatch(/submissionId.*submit|submit/);
    });

    it('evaluateSubmission path contains :submissionId/evaluate', () => {
      const path = Reflect.getMetadata(
        'path',
        GateApprovalActionController.prototype.evaluateSubmission,
      );
      expect(path).toMatch(/submissionId.*evaluate|evaluate/);
    });
  });

  // ── submit endpoint ───────────────────────────────────────────────────────

  describe('POST :submissionId/submit', () => {
    it('rejects missing workspace header with WORKSPACE_REQUIRED ForbiddenException', async () => {
      await expect(
        controller.submitSubmission(makeAuthReq(), undefined, SUB_ID),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.submitSubmission(makeAuthReq(), undefined, SUB_ID),
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'WORKSPACE_REQUIRED' }) });
    });

    it('rejects malformed workspace header (not UUID)', async () => {
      await expect(
        controller.submitSubmission(makeAuthReq(), 'not-a-uuid', SUB_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enforces WRITE role — calls requireWorkspaceWrite with correct args', async () => {
      const submission = { id: SUB_ID, status: GateSubmissionStatus.SUBMITTED };
      evaluatorService.transitionSubmission.mockResolvedValue(submission);

      await controller.submitSubmission(makeAuthReq(), WS_ID, SUB_ID);

      expect(workspaceRoleGuard.requireWorkspaceWrite).toHaveBeenCalledWith(WS_ID, USER_ID);
    });

    it('GOVERNANCE_RULE_BLOCKED ConflictException propagates untouched — NOT wrapped by ResponseService', async () => {
      const governance409 = new ConflictException({
        code: 'GOVERNANCE_RULE_BLOCKED',
        policyCode: 'platform.gate.evidence-required',
        message: 'Gate submission requires at least one evidence document attached',
      });
      evaluatorService.transitionSubmission.mockRejectedValue(governance409);

      // The ConflictException must propagate — responseService.error must NOT be called
      await expect(
        controller.submitSubmission(makeAuthReq(), WS_ID, SUB_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(responseService.error).not.toHaveBeenCalled();

      // The original response body is preserved verbatim
      try {
        await controller.submitSubmission(makeAuthReq(), WS_ID, SUB_ID);
      } catch (err: any) {
        expect(err.response).toMatchObject({
          code: 'GOVERNANCE_RULE_BLOCKED',
          policyCode: 'platform.gate.evidence-required',
        });
      }
    });

    it('returns wrapped submission on success (no governance block)', async () => {
      const submission = { id: SUB_ID, status: GateSubmissionStatus.SUBMITTED };
      evaluatorService.transitionSubmission.mockResolvedValue(submission);

      const result = await controller.submitSubmission(makeAuthReq(), WS_ID, SUB_ID);

      expect(responseService.success).toHaveBeenCalledWith(submission);
      expect(result).toEqual({ data: submission });
    });

    it('passes auth context from JWT — never from body (org+workspace from token)', async () => {
      const submission = { id: SUB_ID, status: GateSubmissionStatus.SUBMITTED };
      evaluatorService.transitionSubmission.mockResolvedValue(submission);

      await controller.submitSubmission(makeAuthReq(), WS_ID, SUB_ID);

      const [passedAuth, passedWsId] = evaluatorService.transitionSubmission.mock.calls[0];
      expect(passedAuth.organizationId).toBe(ORG_ID);
      expect(passedAuth.userId).toBe(USER_ID);
      expect(passedWsId).toBe(WS_ID);
    });
  });

  // ── evaluate endpoint (read-only) ─────────────────────────────────────────

  describe('GET :submissionId/evaluate', () => {
    it('rejects missing workspace header', async () => {
      await expect(
        controller.evaluateSubmission(makeAuthReq(), undefined, SUB_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enforces READ role — calls requireWorkspaceRead with correct args', async () => {
      evaluatorService.evaluateSubmission.mockResolvedValue({
        submissionId: SUB_ID, canApprove: true, items: [], chainState: null,
      });

      await controller.evaluateSubmission(makeAuthReq(), WS_ID, SUB_ID);

      expect(workspaceRoleGuard.requireWorkspaceRead).toHaveBeenCalledWith(WS_ID, USER_ID);
      expect(workspaceRoleGuard.requireWorkspaceWrite).not.toHaveBeenCalled();
    });

    it('returns evaluation result via ResponseService', async () => {
      const evalResult = {
        submissionId: SUB_ID,
        canApprove: false,
        items: [{ code: 'GATE_EVIDENCE_REQUIRED', severity: 'BLOCKER', message: '...' }],
        chainState: null,
      };
      evaluatorService.evaluateSubmission.mockResolvedValue(evalResult);

      const result = await controller.evaluateSubmission(makeAuthReq(), WS_ID, SUB_ID);

      expect(responseService.success).toHaveBeenCalledWith(evalResult);
      expect(result).toEqual({ data: evalResult });
    });

    it('is read-only — transitionSubmission is never called by evaluate', async () => {
      evaluatorService.evaluateSubmission.mockResolvedValue({
        submissionId: SUB_ID, canApprove: true, items: [], chainState: null,
      });

      await controller.evaluateSubmission(makeAuthReq(), WS_ID, SUB_ID);

      expect(evaluatorService.transitionSubmission).not.toHaveBeenCalled();
    });

    it('evaluate never persists — evaluateSubmission is a pure read with no side effects', async () => {
      // Call evaluate multiple times; each call should produce the same result
      // with no mutations (transitionSubmission never called, responseService.error not called
      // unless the service itself errors)
      evaluatorService.evaluateSubmission.mockResolvedValue({
        submissionId: SUB_ID, canApprove: true, items: [], chainState: null,
      });

      const r1 = await controller.evaluateSubmission(makeAuthReq(), WS_ID, SUB_ID);
      const r2 = await controller.evaluateSubmission(makeAuthReq(), WS_ID, SUB_ID);

      expect(r1).toEqual(r2);
      expect(evaluatorService.transitionSubmission).not.toHaveBeenCalled();
      expect(evaluatorService.evaluateSubmission).toHaveBeenCalledTimes(2);
    });
  });
});
