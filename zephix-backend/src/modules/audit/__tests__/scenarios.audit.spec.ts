/**
 * Phase 3B: Scenario audit integration tests.
 */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScenariosService } from '../../scenarios/services/scenarios.service';
import { ScenarioPlan } from '../../scenarios/entities/scenario-plan.entity';
import { ScenarioAction as ScenarioActionEntity } from '../../scenarios/entities/scenario-action.entity';
import { ScenarioResult } from '../../scenarios/entities/scenario-result.entity';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import { AuditService } from '../services/audit.service';
import { AuditEntityType, AuditAction } from '../audit.constants';

const ACTOR = { userId: 'u-1', platformRole: 'ADMIN' };

describe('Scenarios Audit Integration', () => {
  let service: ScenariosService;
  let auditService: { record: jest.Mock };
  let planRepo: any;
  let actionRepo: any;
  let resultRepo: any;

  beforeEach(async () => {
    auditService = { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) };

    planRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((d: any) => d),
      save: jest.fn().mockImplementation((d: any) => Promise.resolve({ ...d, id: 'plan-1' })),
      findOne: jest.fn().mockResolvedValue({
        id: 'plan-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        name: 'Test Plan',
        scopeType: 'project',
        scopeId: 'proj-1',
        status: 'draft',
        deletedAt: null,
        actions: [],
        result: null,
      }),
      find: jest.fn().mockResolvedValue([]),
    };

    actionRepo = {
      create: jest.fn().mockImplementation((d: any) => d),
      save: jest.fn().mockImplementation((d: any) => Promise.resolve({ ...d, id: 'act-1' })),
      findOne: jest.fn().mockResolvedValue({
        id: 'act-1',
        scenarioId: 'plan-1',
        organizationId: 'org-1',
        actionType: 'shift_task',
      }),
      remove: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };

    resultRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d: any) => d),
      save: jest.fn().mockImplementation((d: any) => Promise.resolve({ ...d, id: 'res-1' })),
    };

    const entitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ScenariosService,
        { provide: getRepositoryToken(ScenarioPlan), useValue: planRepo },
        { provide: getRepositoryToken(ScenarioActionEntity), useValue: actionRepo },
        { provide: getRepositoryToken(ScenarioResult), useValue: resultRepo },
        { provide: EntitlementService, useValue: entitlementService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(ScenariosService);
  });

  describe('create', () => {
    it('emits create audit event with actor context', async () => {
      await service.create({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        name: 'New Plan',
        scopeType: 'project' as any,
        scopeId: 'proj-1',
        createdBy: ACTOR.userId,
        actor: ACTOR,
      });

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.SCENARIO_PLAN,
          action: AuditAction.CREATE,
          actorUserId: ACTOR.userId,
        }),
      );
    });

    it('does not emit audit when no actor provided', async () => {
      await service.create({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        name: 'No Audit Plan',
        scopeType: 'project' as any,
        scopeId: 'proj-1',
        createdBy: 'u-1',
      });

      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('emits update audit event with before/after', async () => {
      await service.update('plan-1', 'org-1', { name: 'Updated' }, ACTOR);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.SCENARIO_PLAN,
          action: AuditAction.UPDATE,
          before: expect.objectContaining({ name: 'Test Plan' }),
          after: expect.objectContaining({ name: 'Updated' }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('emits delete audit event', async () => {
      await service.softDelete('plan-1', 'org-1', ACTOR);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.SCENARIO_PLAN,
          action: AuditAction.DELETE,
          metadata: expect.objectContaining({ name: 'Test Plan' }),
        }),
      );
    });
  });

  describe('addAction', () => {
    it('emits create audit event for scenario action', async () => {
      await service.addAction({
        scenarioId: 'plan-1',
        organizationId: 'org-1',
        actionType: 'shift_task' as any,
        payload: { taskId: 't-1', shiftDays: 3 } as any,
        actor: ACTOR,
      });

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.SCENARIO_ACTION,
          action: AuditAction.CREATE,
        }),
      );
    });
  });

  describe('removeAction', () => {
    it('emits delete audit event for scenario action', async () => {
      await service.removeAction('act-1', 'plan-1', 'org-1', ACTOR);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.SCENARIO_ACTION,
          action: AuditAction.DELETE,
          entityId: 'act-1',
        }),
      );
    });
  });

  describe('upsertResult (compute)', () => {
    it('emits compute audit event for new result', async () => {
      await service.upsertResult(
        'plan-1',
        'org-1',
        { impactedProjects: 3 },
        ['warning1'],
        ACTOR,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.SCENARIO_RESULT,
          action: AuditAction.COMPUTE,
          metadata: expect.objectContaining({
            scenarioId: 'plan-1',
            warningsCount: 1,
          }),
        }),
      );
    });

    it('emits compute audit event for existing result update', async () => {
      resultRepo.findOne.mockResolvedValueOnce({
        id: 'res-existing',
        scenarioId: 'plan-1',
        organizationId: 'org-1',
      });

      await service.upsertResult(
        'plan-1',
        'org-1',
        { impactedProjects: 5 },
        ['w1', 'w2'],
        ACTOR,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.COMPUTE,
          metadata: expect.objectContaining({ warningsCount: 2 }),
        }),
      );
    });

    it('does not emit audit when no actor', async () => {
      await service.upsertResult('plan-1', 'org-1', {}, []);
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });
});
