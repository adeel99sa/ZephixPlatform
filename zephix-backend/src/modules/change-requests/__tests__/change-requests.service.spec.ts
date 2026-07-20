import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChangeRequestsService, ActorContext } from '../services/change-requests.service';
import { ChangeRequestEntity } from '../entities/change-request.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { GovernanceRuleEngineService } from '../../governance-rules/services/governance-rule-engine.service';
import { EvaluationDecision } from '../../governance-rules/entities/governance-evaluation.entity';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';
import {
  ChangeRequestImpactScope,
  ChangeRequestStatus,
} from '../types/change-request.enums';

describe('ChangeRequestsService', () => {
  let service: ChangeRequestsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let workspaceRepo: { findOne: jest.Mock };
  // SOD-CONSISTENCY-1: both are @Optional() in the service. They were absent from
  // this suite, so the governance-eval and KPI-emit branches (gated on
  // actor.organizationId) were never exercised — the exact code that silently
  // no-op'd in production because the controller starved organizationId. Inject
  // them so the tests PROVE the branches fire once org is present.
  let governanceEngine: { evaluateChangeRequestStatusChange: jest.Mock };
  let domainEventEmitter: { emit: jest.Mock };

  const wsId = 'ws-1';
  const projId = 'proj-1';
  // SOD-PORT-1: actors carry org context; the default workspace is STANDARD, so
  // self-approval (owner === creator in these fixtures) is permitted + flagged.
  // The GOVERNED block is exercised in dedicated tests below.
  const ownerActor: ActorContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    workspaceRole: 'OWNER',
  };
  const memberActor: ActorContext = {
    userId: 'user-2',
    organizationId: 'org-1',
    workspaceRole: 'MEMBER',
  };

  const makeRow = (overrides: Partial<ChangeRequestEntity> = {}): ChangeRequestEntity =>
    ({
      id: 'cr-1',
      workspaceId: wsId,
      projectId: projId,
      title: 'Test CR',
      description: null,
      reason: null,
      impactScope: ChangeRequestImpactScope.SCOPE,
      impactCost: null,
      impactDays: null,
      status: ChangeRequestStatus.DRAFT,
      createdByUserId: 'user-1',
      approvedByUserId: null,
      approvedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      implementedByUserId: null,
      implementedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ChangeRequestEntity;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'cr-1', ...data })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    workspaceRepo = {
      // Default: STANDARD workspace → self-approval permitted (+ flagged).
      findOne: jest
        .fn()
        .mockResolvedValue({ id: wsId, complexityMode: 'standard' }),
    };

    governanceEngine = {
      evaluateChangeRequestStatusChange: jest.fn().mockResolvedValue({
        decision: EvaluationDecision.ALLOW,
        evaluationId: 'ev-1',
        reasons: [],
      }),
    };
    domainEventEmitter = { emit: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeRequestsService,
        { provide: getRepositoryToken(ChangeRequestEntity), useValue: repo },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepo },
        {
          provide: GovernanceRuleEngineService,
          useValue: governanceEngine,
        },
        { provide: DomainEventEmitterService, useValue: domainEventEmitter },
      ],
    }).compile();

    service = module.get(ChangeRequestsService);
  });

  // ── create ──
  describe('create', () => {
    it('creates a change request with DRAFT status by default', async () => {
      const dto = {
        title: 'Add extra sprint',
        impactScope: ChangeRequestImpactScope.SCHEDULE,
      };
      const result = await service.create(wsId, projId, dto as any, ownerActor);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: wsId,
          projectId: projId,
          title: 'Add extra sprint',
          status: ChangeRequestStatus.DRAFT,
          createdByUserId: 'user-1',
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ── update ──
  describe('update', () => {
    it('allows update when status is DRAFT', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);

      await service.update(wsId, projId, 'cr-1', { title: 'Updated' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated' }),
      );
    });

    it('rejects update when status is not DRAFT', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await expect(
        service.update(wsId, projId, 'cr-1', { title: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── submit ──
  describe('submit', () => {
    it('transitions from DRAFT to SUBMITTED', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);

      await service.submit(wsId, projId, 'cr-1');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ChangeRequestStatus.SUBMITTED }),
      );
    });

    it('rejects submit when not DRAFT', async () => {
      const row = makeRow({ status: ChangeRequestStatus.APPROVED });
      repo.findOne.mockResolvedValue(row);

      await expect(service.submit(wsId, projId, 'cr-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── approve ──
  describe('approve', () => {
    it('allows OWNER to approve a SUBMITTED request', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.approve(wsId, projId, 'cr-1', ownerActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.APPROVED,
          approvedByUserId: 'user-1',
        }),
      );
    });

    it('rejects approval from MEMBER role', async () => {
      await expect(
        service.approve(wsId, projId, 'cr-1', memberActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects approval when not SUBMITTED', async () => {
      const row = makeRow({ status: ChangeRequestStatus.DRAFT });
      repo.findOne.mockResolvedValue(row);

      await expect(
        service.approve(wsId, projId, 'cr-1', ownerActor),
      ).rejects.toThrow(BadRequestException);
    });

    // SOD-PORT-1
    it('GOVERNED: requester cannot approve their OWN change request', async () => {
      // ownerActor (user-1) is also the creator (makeRow default createdByUserId=user-1).
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);
      workspaceRepo.findOne.mockResolvedValue({
        id: wsId,
        complexityMode: 'governed',
      });

      await expect(
        service.approve(wsId, projId, 'cr-1', ownerActor),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('GOVERNED: a DIFFERENT approver (peer) is allowed', async () => {
      const row = makeRow({
        status: ChangeRequestStatus.SUBMITTED,
        createdByUserId: 'user-3', // requester differs from ownerActor (user-1)
      });
      repo.findOne.mockResolvedValue(row);
      workspaceRepo.findOne.mockResolvedValue({
        id: wsId,
        complexityMode: 'governed',
      });

      await service.approve(wsId, projId, 'cr-1', ownerActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.APPROVED,
          approvedByUserId: 'user-1',
        }),
      );
    });
  });

  // SOD-CONSISTENCY-1: the CR HTTP surface silently omitted organizationId, so
  // self-approval mode-honouring, governance rule evaluation, and KPI events all
  // no-op'd. These assertions PROVE each branch fires once org is present — the
  // coverage that would have caught the original defect.
  describe('SOD-CONSISTENCY-1: org context drives governance branches', () => {
    it('STANDARD: requester CAN self-approve, and the receipt records selfApproved', async () => {
      // ownerActor (user-1) is also the creator → self-approval, permitted in STANDARD.
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);
      // workspaceRepo default is STANDARD.

      await service.approve(wsId, projId, 'cr-1', ownerActor);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.APPROVED,
          approvedByUserId: 'user-1',
        }),
      );
      // The domain event's meta must not imply peer review that did not happen.
      expect(domainEventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED,
        expect.objectContaining({ meta: { selfApproved: true } }),
      );
    });

    it('approve RUNS governance rule evaluation (service:195 is no longer dead)', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.approve(wsId, projId, 'cr-1', ownerActor);

      expect(
        governanceEngine.evaluateChangeRequestStatusChange,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: wsId,
          toStatus: ChangeRequestStatus.APPROVED,
        }),
      );
    });

    it('approve blocked when governance returns BLOCK (proves the result is honoured)', async () => {
      const row = makeRow({
        status: ChangeRequestStatus.SUBMITTED,
        createdByUserId: 'user-3', // not a self-approval; isolate the gov branch
      });
      repo.findOne.mockResolvedValue(row);
      governanceEngine.evaluateChangeRequestStatusChange.mockResolvedValue({
        decision: EvaluationDecision.BLOCK,
        evaluationId: 'ev-block',
        reasons: ['nope'],
      });

      await expect(
        service.approve(wsId, projId, 'cr-1', ownerActor),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('approve EMITS a KPI domain event (service:230 is no longer dead)', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.approve(wsId, projId, 'cr-1', ownerActor);

      expect(domainEventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED,
        expect.objectContaining({
          organizationId: 'org-1',
          entityType: 'CHANGE_REQUEST',
        }),
      );
    });

    it('reject EMITS a KPI domain event (service:271 is no longer dead)', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.reject(wsId, projId, 'cr-1', ownerActor, { reason: 'no' });

      expect(domainEventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED,
        expect.objectContaining({
          organizationId: 'org-1',
          entityType: 'CHANGE_REQUEST',
        }),
      );
    });

    it('ActorContext cannot be constructed without organizationId (compile-time guard)', () => {
      // @ts-expect-error organizationId is REQUIRED on ActorContext — omitting it
      // must NOT compile. If this line ever compiles clean, the unused-directive
      // error fails the build, re-flagging the exact regression we just fixed.
      const starved: ActorContext = { userId: 'x', workspaceRole: 'OWNER' };
      expect(starved).toBeDefined();
    });
  });

  // ── reject ──
  describe('reject', () => {
    it('allows OWNER to reject and stores reason', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.reject(wsId, projId, 'cr-1', ownerActor, { reason: 'Too expensive' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.REJECTED,
          rejectedByUserId: 'user-1',
          rejectionReason: 'Too expensive',
        }),
      );
    });

    it('rejects rejection from MEMBER role', async () => {
      await expect(
        service.reject(wsId, projId, 'cr-1', memberActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── implement ──
  describe('implement', () => {
    it('transitions from APPROVED to IMPLEMENTED', async () => {
      const row = makeRow({ status: ChangeRequestStatus.APPROVED });
      repo.findOne.mockResolvedValue(row);

      await service.implement(wsId, projId, 'cr-1', ownerActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.IMPLEMENTED,
          implementedByUserId: 'user-1',
        }),
      );
    });

    it('rejects implement when not APPROVED', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await expect(
        service.implement(wsId, projId, 'cr-1', ownerActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove ──
  describe('remove', () => {
    it('allows delete when DRAFT', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);

      const result = await service.remove(wsId, projId, 'cr-1');
      expect(result).toEqual({ deleted: true });
      expect(repo.delete).toHaveBeenCalledWith({
        id: 'cr-1',
        workspaceId: wsId,
        projectId: projId,
      });
    });

    it('rejects delete when not DRAFT', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await expect(service.remove(wsId, projId, 'cr-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── get ──
  describe('get', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.get(wsId, projId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // DTO-GAPS-1: self-approval is surfaced on the CR list DTO, derived at the
  // source from authoritative ids (approver IS the creator) — the FE must never
  // re-derive it by comparing actor ids or reading event metadata.
  describe('list — selfApproved', () => {
    it('flags selfApproved when approvedBy === createdBy', async () => {
      repo.find.mockResolvedValue([
        { id: 'cr-a', createdByUserId: 'u-1', approvedByUserId: 'u-1' },
        { id: 'cr-b', createdByUserId: 'u-1', approvedByUserId: 'u-2' },
        { id: 'cr-c', createdByUserId: 'u-1', approvedByUserId: null },
      ]);
      const rows = await service.list(wsId, projId);
      expect(rows.find((r) => r.id === 'cr-a')!.selfApproved).toBe(true);
      expect(rows.find((r) => r.id === 'cr-b')!.selfApproved).toBe(false);
      // not yet approved → never self-approved
      expect(rows.find((r) => r.id === 'cr-c')!.selfApproved).toBe(false);
    });
  });
});
