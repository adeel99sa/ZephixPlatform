/**
 * gate-submission-evidence-routes.spec.ts
 *
 * Full-path v2 coverage for the three evidence endpoints on GateApprovalActionController:
 *   POST   /work/gate-submissions/:submissionId/evidence
 *   GET    /work/gate-submissions/:submissionId/evidence
 *   DELETE /work/gate-submissions/:submissionId/evidence/:evidenceId
 *
 * Tests: route registration, guard enforcement, cross-project artifact rejection,
 * duplicate-attachment 409, not-found 404, and happy-path responses.
 */
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GateApprovalActionController } from '../gate-approval-action.controller';
import { GateApprovalEngineService } from '../../services/gate-approval-engine.service';
import { GateApprovalChainService } from '../../services/gate-approval-chain.service';
import { PhaseGateEvaluatorService } from '../../services/phase-gate-evaluator.service';
import { WorkspaceRoleGuardService } from '../../../workspace-access/workspace-role-guard.service';
import { ResponseService } from '../../../../shared/services/response.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { GateSubmissionEvidence } from '../../entities/gate-submission-evidence.entity';
import { PhaseGateSubmission } from '../../entities/phase-gate-submission.entity';
import { ProjectArtifactItem } from '../../../project-artifacts/entities/project-artifact-item.entity';

const WS_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const ORG_ID = 'org-uuid-1234-5678-abcd-ef0123456789';
const USER_ID = 'user-uuid-1234-5678-abcd-ef0123456789';
const SUB_ID = 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1';
const PROJECT_ID = 'proj-uuid-1111-2222-3333-444444444444';
const ARTIFACT_ITEM_ID = 'item-uuid-1111-2222-3333-444444444444';
const EVIDENCE_ID = 'evid-uuid-1111-2222-3333-444444444444';

function makeAuthReq(userId = USER_ID, orgId = ORG_ID) {
  return {
    user: { id: userId, organizationId: orgId, role: 'ADMIN' },
  } as any;
}

const makeSubmission = (overrides = {}) => ({
  id: SUB_ID,
  workspaceId: WS_ID,
  organizationId: ORG_ID,
  projectId: PROJECT_ID,
  status: 'DRAFT',
  ...overrides,
});

const makeEvidence = (overrides = {}) => ({
  id: EVIDENCE_ID,
  submissionId: SUB_ID,
  artifactItemId: ARTIFACT_ITEM_ID,
  organizationId: ORG_ID,
  attachedByUserId: USER_ID,
  createdAt: new Date('2026-07-09T00:00:00.000Z'),
  ...overrides,
});

const makeItem = () => ({ id: ARTIFACT_ITEM_ID });

describe('GateApprovalActionController — evidence routes', () => {
  let controller: GateApprovalActionController;
  let evidenceRepo: Record<string, jest.Mock>;
  let submissionRepo: Record<string, jest.Mock>;
  let artifactItemRepo: Record<string, jest.Mock>;
  let workspaceRoleGuard: Record<string, jest.Mock>;
  let responseService: Record<string, jest.Mock>;

  beforeEach(async () => {
    evidenceRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    submissionRepo = { findOne: jest.fn() };
    artifactItemRepo = {
      createQueryBuilder: jest.fn(),
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
        {
          provide: GateApprovalEngineService,
          useValue: {
            activateChainOnSubmission: jest.fn(),
            approveStep: jest.fn(),
            rejectStep: jest.fn(),
            checkAndEscalateOverdueSteps: jest.fn(),
          },
        },
        { provide: GateApprovalChainService, useValue: {} },
        {
          provide: PhaseGateEvaluatorService,
          useValue: { transitionSubmission: jest.fn(), evaluateSubmission: jest.fn() },
        },
        { provide: WorkspaceRoleGuardService, useValue: workspaceRoleGuard },
        { provide: ResponseService, useValue: responseService },
        { provide: getRepositoryToken(GateSubmissionEvidence), useValue: evidenceRepo },
        { provide: getRepositoryToken(PhaseGateSubmission), useValue: submissionRepo },
        { provide: getRepositoryToken(ProjectArtifactItem), useValue: artifactItemRepo },
      ],
    }).compile();

    controller = module.get(GateApprovalActionController);
  });

  // ── Route registration ────────────────────────────────────────────────────

  describe('route registration', () => {
    it('controller is mounted at work/gate-submissions', () => {
      expect(Reflect.getMetadata('path', GateApprovalActionController)).toBe('work/gate-submissions');
    });

    it('JwtAuthGuard is applied at class level', () => {
      const guards = Reflect.getMetadata('__guards__', GateApprovalActionController) || [];
      const classes = guards.map((g: any) => (typeof g === 'function' ? g : g?.constructor));
      expect(classes).toContain(JwtAuthGuard);
    });

    it('attachEvidence method exists on prototype', () => {
      expect(typeof GateApprovalActionController.prototype.attachEvidence).toBe('function');
    });

    it('listEvidence method exists on prototype', () => {
      expect(typeof GateApprovalActionController.prototype.listEvidence).toBe('function');
    });

    it('detachEvidence method exists on prototype', () => {
      expect(typeof GateApprovalActionController.prototype.detachEvidence).toBe('function');
    });

    it('attachEvidence is registered as POST', () => {
      const method = Reflect.getMetadata('method', GateApprovalActionController.prototype.attachEvidence);
      expect(method).toBe(1); // POST
    });

    it('listEvidence is registered as GET', () => {
      const method = Reflect.getMetadata('method', GateApprovalActionController.prototype.listEvidence);
      expect(method).toBe(0); // GET
    });

    it('detachEvidence is registered as DELETE', () => {
      const method = Reflect.getMetadata('method', GateApprovalActionController.prototype.detachEvidence);
      expect(method).toBe(3); // DELETE
    });

    it('attachEvidence path contains :submissionId/evidence', () => {
      const path = Reflect.getMetadata('path', GateApprovalActionController.prototype.attachEvidence);
      expect(path).toMatch(/submissionId.*evidence/);
    });

    it('detachEvidence path contains :submissionId/evidence/:evidenceId', () => {
      const path = Reflect.getMetadata('path', GateApprovalActionController.prototype.detachEvidence);
      expect(path).toMatch(/submissionId.*evidence.*evidenceId/);
    });
  });

  // ── POST :submissionId/evidence ───────────────────────────────────────────

  describe('POST :submissionId/evidence — attachEvidence', () => {
    it('rejects missing workspace header with WORKSPACE_REQUIRED', async () => {
      await expect(
        controller.attachEvidence(makeAuthReq(), undefined, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enforces WRITE role — calls requireWorkspaceWrite', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(makeItem()) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);
      evidenceRepo.save.mockResolvedValue(makeEvidence());

      await controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID });

      expect(workspaceRoleGuard.requireWorkspaceWrite).toHaveBeenCalledWith(WS_ID, USER_ID);
      expect(workspaceRoleGuard.requireWorkspaceRead).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when submission not found in workspace', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'SUBMISSION_NOT_FOUND' }) });
    });

    it('rejects cross-project artifact with 422 ARTIFACT_NOT_IN_PROJECT', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'ARTIFACT_NOT_IN_PROJECT' }) });
    });

    it('cross-project query filters on submission.projectId — not a different project', async () => {
      const submission = makeSubmission({ projectId: 'correct-project-id' });
      submissionRepo.findOne.mockResolvedValue(submission);
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toThrow(UnprocessableEntityException);

      // Verify the queryBuilder received the correct projectId
      const andWhereCalls = qb.andWhere.mock.calls;
      const projectCall = andWhereCalls.find((c: any[]) => c[0].includes('project_id'));
      expect(projectCall?.[1]).toEqual({ projectId: 'correct-project-id' });
    });

    it('returns 409 EVIDENCE_ALREADY_ATTACHED on duplicate UNIQUE violation', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(makeItem()) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);
      evidenceRepo.save.mockRejectedValue({ code: '23505', detail: 'Key already exists' });

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toThrow(ConflictException);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'EVIDENCE_ALREADY_ATTACHED' }) });
    });

    it('non-unique DB errors propagate without wrapping', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(makeItem()) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);
      const dbError = Object.assign(new Error('DB connection lost'), { code: '57P01' });
      evidenceRepo.save.mockRejectedValue(dbError);

      await expect(
        controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID }),
      ).rejects.toThrow('DB connection lost');
    });

    it('returns wrapped evidence row on success', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(makeItem()) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);
      const saved = makeEvidence();
      evidenceRepo.save.mockResolvedValue(saved);

      const result = await controller.attachEvidence(
        makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID },
      );

      expect(responseService.success).toHaveBeenCalledWith(saved);
      expect(result).toEqual({ data: saved });
    });

    it('sets organizationId and attachedByUserId from auth context — never from body', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(makeItem()) };
      artifactItemRepo.createQueryBuilder.mockReturnValue(qb);
      evidenceRepo.save.mockResolvedValue(makeEvidence());

      await controller.attachEvidence(makeAuthReq(), WS_ID, SUB_ID, { artifactItemId: ARTIFACT_ITEM_ID });

      const created = evidenceRepo.create.mock.calls[0][0];
      expect(created.organizationId).toBe(ORG_ID);
      expect(created.attachedByUserId).toBe(USER_ID);
      expect(created.submissionId).toBe(SUB_ID);
      expect(created.artifactItemId).toBe(ARTIFACT_ITEM_ID);
    });
  });

  // ── GET :submissionId/evidence ────────────────────────────────────────────

  describe('GET :submissionId/evidence — listEvidence', () => {
    it('rejects missing workspace header', async () => {
      await expect(
        controller.listEvidence(makeAuthReq(), undefined, SUB_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enforces READ role — calls requireWorkspaceRead, not Write', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      evidenceRepo.find.mockResolvedValue([]);

      await controller.listEvidence(makeAuthReq(), WS_ID, SUB_ID);

      expect(workspaceRoleGuard.requireWorkspaceRead).toHaveBeenCalledWith(WS_ID, USER_ID);
      expect(workspaceRoleGuard.requireWorkspaceWrite).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when submission not found', async () => {
      submissionRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.listEvidence(makeAuthReq(), WS_ID, SUB_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns empty list when no evidence attached', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      evidenceRepo.find.mockResolvedValue([]);

      const result = await controller.listEvidence(makeAuthReq(), WS_ID, SUB_ID);

      expect(responseService.success).toHaveBeenCalledWith([]);
      expect(result).toEqual({ data: [] });
    });

    it('returns list of evidence rows in ASC order', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      const rows = [makeEvidence({ id: 'e1' }), makeEvidence({ id: 'e2' })];
      evidenceRepo.find.mockResolvedValue(rows);

      const result = await controller.listEvidence(makeAuthReq(), WS_ID, SUB_ID);

      expect(responseService.success).toHaveBeenCalledWith(rows);
      expect(result).toEqual({ data: rows });
    });

    it('scopes query to submissionId and organizationId from auth', async () => {
      submissionRepo.findOne.mockResolvedValue(makeSubmission());
      evidenceRepo.find.mockResolvedValue([]);

      await controller.listEvidence(makeAuthReq(), WS_ID, SUB_ID);

      const findArgs = evidenceRepo.find.mock.calls[0][0];
      expect(findArgs.where).toMatchObject({ submissionId: SUB_ID, organizationId: ORG_ID });
      expect(findArgs.order).toMatchObject({ createdAt: 'ASC' });
    });
  });

  // ── DELETE :submissionId/evidence/:evidenceId ─────────────────────────────

  describe('DELETE :submissionId/evidence/:evidenceId — detachEvidence', () => {
    it('rejects missing workspace header', async () => {
      await expect(
        controller.detachEvidence(makeAuthReq(), undefined, SUB_ID, EVIDENCE_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enforces WRITE role', async () => {
      evidenceRepo.findOne.mockResolvedValue(makeEvidence());
      evidenceRepo.delete.mockResolvedValue({ affected: 1 });

      await controller.detachEvidence(makeAuthReq(), WS_ID, SUB_ID, EVIDENCE_ID);

      expect(workspaceRoleGuard.requireWorkspaceWrite).toHaveBeenCalledWith(WS_ID, USER_ID);
    });

    it('throws NotFoundException when evidence row not found', async () => {
      evidenceRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.detachEvidence(makeAuthReq(), WS_ID, SUB_ID, EVIDENCE_ID),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.detachEvidence(makeAuthReq(), WS_ID, SUB_ID, EVIDENCE_ID),
      ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'EVIDENCE_NOT_FOUND' }) });
    });

    it('scopes findOne to both evidenceId and submissionId — prevents cross-submission deletion', async () => {
      evidenceRepo.findOne.mockResolvedValue(makeEvidence());
      evidenceRepo.delete.mockResolvedValue({ affected: 1 });

      await controller.detachEvidence(makeAuthReq(), WS_ID, SUB_ID, EVIDENCE_ID);

      const findOneArg = evidenceRepo.findOne.mock.calls[0][0];
      expect(findOneArg.where).toMatchObject({ id: EVIDENCE_ID, submissionId: SUB_ID });
    });

    it('returns { deleted: evidenceId } on success', async () => {
      evidenceRepo.findOne.mockResolvedValue(makeEvidence());
      evidenceRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await controller.detachEvidence(makeAuthReq(), WS_ID, SUB_ID, EVIDENCE_ID);

      expect(responseService.success).toHaveBeenCalledWith({ deleted: EVIDENCE_ID });
      expect(result).toEqual({ data: { deleted: EVIDENCE_ID } });
    });
  });
});
