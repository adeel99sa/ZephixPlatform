import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WorkPhasesService } from './work-phases.service';
import { WorkPhase } from '../entities/work-phase.entity';
import { Project } from '../../projects/entities/project.entity';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditAction } from '../../audit/audit.constants';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { AckTokenService } from './ack-token.service';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const WS_ID = '00000000-0000-0000-0000-000000000002';
const USER_ID = '00000000-0000-0000-0000-000000000003';
const PROJECT_ID = '00000000-0000-0000-0000-000000000004';
const P1 = '00000000-0000-0000-0000-0000000000a1';
const P2 = '00000000-0000-0000-0000-0000000000a2';
const P3 = '00000000-0000-0000-0000-0000000000a3';
const FOREIGN = '00000000-0000-0000-0000-0000000000ff';

const auth = {
  organizationId: ORG_ID,
  userId: USER_ID,
  platformRole: 'MEMBER',
};

describe('WorkPhasesService.reorderPhases', () => {
  let service: WorkPhasesService;
  let phaseRepo: Record<string, jest.Mock>;
  let projectRepo: Record<string, jest.Mock>;
  let auditRepo: Record<string, jest.Mock>;
  let managerUpdate: jest.Mock;
  let transaction: jest.Mock;
  let workspaceAccess: Record<string, jest.Mock>;

  // Records every manager.update(entity, where, patch) as {id, sortOrder}
  // in call order so the two-pass negative-offset sequence can be asserted.
  let updateCalls: Array<{ id: string; sortOrder: number }>;

  beforeEach(async () => {
    updateCalls = [];
    managerUpdate = jest.fn(async (_entity, where, patch) => {
      updateCalls.push({ id: where.id, sortOrder: patch.sortOrder });
      return { affected: 1 };
    });
    transaction = jest.fn(async (cb) => cb({ update: managerUpdate }));

    phaseRepo = {
      find: jest.fn().mockResolvedValue([{ id: P1 }, { id: P2 }, { id: P3 }]),
    };
    projectRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: PROJECT_ID, state: 'DRAFT', structureLocked: false }),
    };
    auditRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: 'audit-1' })),
    };
    workspaceAccess = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkPhasesService,
        { provide: getRepositoryToken(WorkPhase), useValue: phaseRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(AuditEvent), useValue: auditRepo },
        { provide: DataSource, useValue: { transaction } },
        { provide: WorkspaceAccessService, useValue: workspaceAccess },
        {
          provide: TenantContextService,
          useValue: { assertOrganizationId: () => ORG_ID },
        },
        { provide: AckTokenService, useValue: {} },
      ],
    }).compile();

    service = module.get(WorkPhasesService);
  });

  it('reorders (reverse) via two-pass negative-offset then final positions', async () => {
    await service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P3, P2, P1]);

    // Pass 1: all parked in negative space, in list order.
    // Pass 2: settled to final 1..N, in list order.
    expect(updateCalls).toEqual([
      { id: P3, sortOrder: -1 },
      { id: P2, sortOrder: -2 },
      { id: P1, sortOrder: -3 },
      { id: P3, sortOrder: 1 },
      { id: P2, sortOrder: 2 },
      { id: P1, sortOrder: 3 },
    ]);
    // Every negative write precedes every positive write (no mid-flight collision).
    const firstPositive = updateCalls.findIndex((c) => c.sortOrder > 0);
    const lastNegative = updateCalls.map((c) => c.sortOrder).lastIndexOf(-3);
    expect(lastNegative).toBeLessThan(firstPositive);

    // Audit row lands (SEC-4 Proof C) — action + entity vocab.
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.PHASE_REORDERED,
        entityId: PROJECT_ID,
        metadataJson: { orderedPhaseIds: [P3, P2, P1] },
      }),
    );
    expect(auditRepo.save).toHaveBeenCalled();
  });

  it('reorders (rotate) with correct final order', async () => {
    await service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P2, P3, P1]);
    const finalPass = updateCalls.filter((c) => c.sortOrder > 0);
    expect(finalPass).toEqual([
      { id: P2, sortOrder: 1 },
      { id: P3, sortOrder: 2 },
      { id: P1, sortOrder: 3 },
    ]);
  });

  it('identity reorder is an idempotent 200 that still writes the audit row', async () => {
    await service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P1, P2, P3]);
    expect(managerUpdate).toHaveBeenCalledTimes(6); // still two-pass
    const finalPass = updateCalls.filter((c) => c.sortOrder > 0);
    expect(finalPass).toEqual([
      { id: P1, sortOrder: 1 },
      { id: P2, sortOrder: 2 },
      { id: P3, sortOrder: 3 },
    ]);
    expect(auditRepo.save).toHaveBeenCalled();
  });

  it('rejects a partial list (missing id) with 400 and never writes', async () => {
    await expect(
      service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P1, P2]),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PHASE_REORDER_INVALID_SET',
        missingIds: [P3],
      }),
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(auditRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a foreign id with 400 and never writes', async () => {
    await expect(
      service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P1, P2, P3, FOREIGN]),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PHASE_REORDER_INVALID_SET',
        foreignIds: [FOREIGN],
      }),
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a duplicate id with 400 and never writes', async () => {
    await expect(
      service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P1, P2, P2]),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PHASE_REORDER_INVALID_SET',
        duplicateIds: [P2],
        // P2 dup pushes P3 out of the set → also flagged missing (fail-loud, names both)
        missingIds: [P3],
      }),
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('is a BadRequestException (400) for invalid sets', async () => {
    await expect(
      service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [FOREIGN]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the project does not exist', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await expect(
      service.reorderPhases(auth as any, WS_ID, PROJECT_ID, [P1, P2, P3]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
