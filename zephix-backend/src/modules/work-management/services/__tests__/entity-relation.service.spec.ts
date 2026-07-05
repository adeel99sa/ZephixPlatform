/**
 * Wave 1 Track D — EntityRelationService unit tests
 *
 * Covers:
 *  - Write normalization (MITIGATES flip, RELATES_TO symmetric dedup)
 *  - task↔task 409 USE_DEPENDENCIES rejection
 *  - Cross-workspace 404 isolation
 *  - Soft-deleted endpoint 404
 *  - GC_ENDPOINT_TABLES mirror contract
 *  - Orphan GC: runGcForLink removes link when endpoint is deleted
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityRelationService } from '../entity-relation.service';
import {
  WorkEntityType,
  WorkRelationType,
} from '../../entities/work-entity-link.entity';

// ── Mock factories ─────────────────────────────────────────────────────────────

const makeLinkRepo = (overrides: Partial<Record<string, jest.Mock>> = {}) => ({
  create: jest.fn((d) => ({ ...d, id: 'link-1' })),
  save: jest.fn((e) => Promise.resolve({ ...e, id: 'link-1', createdAt: new Date() })),
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  remove: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeEntityRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  workspaceId: 'ws-1',
  deletedAt: null,
  ...overrides,
});

function makeService(
  taskRepoOvr: Partial<Record<string, jest.Mock>> = {},
  riskRepoOvr: Partial<Record<string, jest.Mock>> = {},
  artifactItemRepoOvr: Partial<Record<string, jest.Mock>> = {},
  linkRepoOvr: Partial<Record<string, jest.Mock>> = {},
) {
  const linkRepo = makeLinkRepo(linkRepoOvr);

  const taskRepo = {
    findOne: jest.fn().mockResolvedValue(makeEntityRow()),
    ...taskRepoOvr,
  };
  const riskRepo = {
    findOne: jest.fn().mockResolvedValue(makeEntityRow()),
    ...riskRepoOvr,
  };
  const artifactItemRepo = {
    findOne: jest.fn().mockResolvedValue(makeEntityRow()),
    ...artifactItemRepoOvr,
  };

  const service = new EntityRelationService(
    linkRepo as any,
    taskRepo as any,
    riskRepo as any,
    artifactItemRepo as any,
  );
  return { service, linkRepo, taskRepo, riskRepo, artifactItemRepo };
}

const auth = { userId: 'u-1', organizationId: 'org-1' };
const WS = 'ws-1';

// ── Write normalization ────────────────────────────────────────────────────────

describe('EntityRelationService — write normalization', () => {
  describe('normalizeEndpoints', () => {
    let service: EntityRelationService;
    beforeEach(() => ({ service } = makeService()));

    it('MITIGATES: keeps TASK→RISK as-is (canonical direction)', () => {
      const result = service.normalizeEndpoints(
        WorkEntityType.TASK, 'task-1',
        WorkEntityType.RISK, 'risk-1',
        WorkRelationType.MITIGATES,
      );
      expect(result.sourceType).toBe(WorkEntityType.TASK);
      expect(result.sourceId).toBe('task-1');
      expect(result.targetType).toBe(WorkEntityType.RISK);
      expect(result.targetId).toBe('risk-1');
    });

    it('MITIGATES: flips RISK→TASK to TASK→RISK (silent normalization)', () => {
      // Spec for founder amendment: flipped MITIGATES insert stores canonically
      const result = service.normalizeEndpoints(
        WorkEntityType.RISK, 'risk-1',
        WorkEntityType.TASK, 'task-1',
        WorkRelationType.MITIGATES,
      );
      expect(result.sourceType).toBe(WorkEntityType.TASK);
      expect(result.sourceId).toBe('task-1');
      expect(result.targetType).toBe(WorkEntityType.RISK);
      expect(result.targetId).toBe('risk-1');
    });

    it('RELATES_TO: same pair in both directions normalizes to same canonical form', () => {
      // Spec for founder amendment: reversed RELATES_TO yields same canonical endpoints
      // so the unique constraint prevents duplicates
      const fwd = service.normalizeEndpoints(
        WorkEntityType.TASK, 'aaa',
        WorkEntityType.RISK, 'bbb',
        WorkRelationType.RELATES_TO,
      );
      const rev = service.normalizeEndpoints(
        WorkEntityType.RISK, 'bbb',
        WorkEntityType.TASK, 'aaa',
        WorkRelationType.RELATES_TO,
      );
      expect(fwd.sourceType).toBe(rev.sourceType);
      expect(fwd.sourceId).toBe(rev.sourceId);
      expect(fwd.targetType).toBe(rev.targetType);
      expect(fwd.targetId).toBe(rev.targetId);
    });

    it('RELATES_TO: same-type pair normalized by uuid order', () => {
      const fwd = service.normalizeEndpoints(
        WorkEntityType.RISK, 'zzz',
        WorkEntityType.RISK, 'aaa',
        WorkRelationType.RELATES_TO,
      );
      const rev = service.normalizeEndpoints(
        WorkEntityType.RISK, 'aaa',
        WorkEntityType.RISK, 'zzz',
        WorkRelationType.RELATES_TO,
      );
      expect(fwd.sourceId).toBe(rev.sourceId);
      expect(fwd.targetId).toBe(rev.targetId);
    });
  });
});

// ── task↔task rejection ────────────────────────────────────────────────────────

describe('EntityRelationService — task↔task 409', () => {
  it('rejects task↔task with 409 USE_DEPENDENCIES', async () => {
    const { service } = makeService();
    await expect(
      service.create(auth, WS, {
        sourceEntityType: WorkEntityType.TASK,
        sourceEntityId: 'task-1',
        targetEntityType: WorkEntityType.TASK,
        targetEntityId: 'task-2',
        relationType: WorkRelationType.RELATES_TO,
      }),
    ).rejects.toMatchObject({
      response: { code: 'USE_DEPENDENCIES' },
    });
  });
});

// ── Cross-workspace isolation ──────────────────────────────────────────────────

describe('EntityRelationService — cross-workspace 404', () => {
  it('throws 404 when source endpoint is in a different workspace', async () => {
    const { service } = makeService(
      // task from ws-OTHER
      { findOne: jest.fn().mockResolvedValue(makeEntityRow({ workspaceId: 'ws-OTHER' })) },
    );
    await expect(
      service.create(auth, WS, {
        sourceEntityType: WorkEntityType.TASK,
        sourceEntityId: 'task-1',
        targetEntityType: WorkEntityType.RISK,
        targetEntityId: 'risk-1',
        relationType: WorkRelationType.MITIGATES,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when target endpoint is in a different workspace', async () => {
    const { service } = makeService(
      // task is fine
      {},
      // risk from ws-OTHER
      { findOne: jest.fn().mockResolvedValue(makeEntityRow({ workspaceId: 'ws-OTHER' })) },
    );
    await expect(
      service.create(auth, WS, {
        sourceEntityType: WorkEntityType.TASK,
        sourceEntityId: 'task-1',
        targetEntityType: WorkEntityType.RISK,
        targetEntityId: 'risk-1',
        relationType: WorkRelationType.MITIGATES,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── Soft-deleted endpoint 404 ─────────────────────────────────────────────────

describe('EntityRelationService — soft-deleted endpoint 404', () => {
  it('throws 404 when source is soft-deleted', async () => {
    const { service } = makeService(
      { findOne: jest.fn().mockResolvedValue(makeEntityRow({ deletedAt: new Date() })) },
    );
    await expect(
      service.create(auth, WS, {
        sourceEntityType: WorkEntityType.TASK,
        sourceEntityId: 'task-deleted',
        targetEntityType: WorkEntityType.RISK,
        targetEntityId: 'risk-1',
        relationType: WorkRelationType.MITIGATES,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 404 when target is soft-deleted', async () => {
    const { service } = makeService(
      {},
      { findOne: jest.fn().mockResolvedValue(makeEntityRow({ deletedAt: new Date() })) },
    );
    await expect(
      service.create(auth, WS, {
        sourceEntityType: WorkEntityType.TASK,
        sourceEntityId: 'task-1',
        targetEntityType: WorkEntityType.RISK,
        targetEntityId: 'risk-deleted',
        relationType: WorkRelationType.MITIGATES,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── Happy-path create ─────────────────────────────────────────────────────────

describe('EntityRelationService — create happy path', () => {
  it('creates TASK→RISK MITIGATES link and returns saved entity', async () => {
    const { service } = makeService();
    const result = await service.create(auth, WS, {
      sourceEntityType: WorkEntityType.TASK,
      sourceEntityId: 'task-1',
      targetEntityType: WorkEntityType.RISK,
      targetEntityId: 'risk-1',
      relationType: WorkRelationType.MITIGATES,
    });
    expect(result.id).toBe('link-1');
    expect(result.relationType).toBe(WorkRelationType.MITIGATES);
  });

  it('stores flipped MITIGATES canonically (RISK→TASK input → TASK→RISK stored)', async () => {
    const { service, linkRepo } = makeService();
    await service.create(auth, WS, {
      sourceEntityType: WorkEntityType.RISK,
      sourceEntityId: 'risk-1',
      targetEntityType: WorkEntityType.TASK,
      targetEntityId: 'task-1',
      relationType: WorkRelationType.MITIGATES,
    });
    const created = linkRepo.create.mock.calls[0][0];
    expect(created.sourceEntityType).toBe(WorkEntityType.TASK);
    expect(created.targetEntityType).toBe(WorkEntityType.RISK);
  });
});

// ── GC_ENDPOINT_TABLES mirror contract ────────────────────────────────────────

describe('EntityRelationService — GC_ENDPOINT_TABLES mirror contract', () => {
  /**
   * These tests pin the endpoint-resolution table documented in the service's
   * GC_ENDPOINT_TABLES mirror-comment. Any change to entity→repo routing in
   * isEndpointAlive() must also update GC_ENDPOINT_TABLES + this spec.
   */

  it('TASK type routes to taskRepo for liveness check', async () => {
    const taskFindOne = jest.fn().mockResolvedValue({ id: 'task-1', deletedAt: null });
    const { service, taskRepo } = makeService({ findOne: taskFindOne });
    await service['isEndpointAlive'](WorkEntityType.TASK, 'task-1');
    expect(taskRepo.findOne).toHaveBeenCalled();
  });

  it('RISK type routes to riskRepo for liveness check', async () => {
    const riskFindOne = jest.fn().mockResolvedValue({ id: 'risk-1', deletedAt: null });
    const { service, riskRepo } = makeService({}, { findOne: riskFindOne });
    await service['isEndpointAlive'](WorkEntityType.RISK, 'risk-1');
    expect(riskRepo.findOne).toHaveBeenCalled();
  });

  it('ARTIFACT type routes to artifactItemRepo (project_artifact_items, not envelope)', async () => {
    const artifactFindOne = jest.fn().mockResolvedValue({ id: 'item-1', deletedAt: null });
    const { service, artifactItemRepo } = makeService({}, {}, { findOne: artifactFindOne });
    await service['isEndpointAlive'](WorkEntityType.ARTIFACT, 'item-1');
    expect(artifactItemRepo.findOne).toHaveBeenCalled();
  });
});

// ── Orphan GC ─────────────────────────────────────────────────────────────────

describe('EntityRelationService — orphan GC', () => {
  it('runGcForLink deletes link when source endpoint is soft-deleted', async () => {
    const existingLink = {
      id: 'link-1',
      sourceEntityType: WorkEntityType.TASK,
      sourceEntityId: 'task-dead',
      targetEntityType: WorkEntityType.RISK,
      targetEntityId: 'risk-1',
    };
    const { service, linkRepo, taskRepo } = makeService(
      { findOne: jest.fn().mockResolvedValue({ id: 'task-dead', deletedAt: new Date() }) },
    );
    linkRepo.findOne.mockResolvedValue(existingLink);

    const pruned = await service.runGcForLink('link-1');
    expect(pruned).toBe(true);
    expect(linkRepo.delete).toHaveBeenCalledWith({ id: 'link-1' });
  });

  it('runGcForLink returns false when both endpoints are alive (no delete)', async () => {
    const existingLink = {
      id: 'link-1',
      sourceEntityType: WorkEntityType.TASK,
      sourceEntityId: 'task-1',
      targetEntityType: WorkEntityType.RISK,
      targetEntityId: 'risk-1',
    };
    const { service, linkRepo } = makeService();
    linkRepo.findOne.mockResolvedValue(existingLink);

    const pruned = await service.runGcForLink('link-1');
    expect(pruned).toBe(false);
    expect(linkRepo.delete).not.toHaveBeenCalled();
  });

  it('runGcForLink returns false when link does not exist', async () => {
    const { service } = makeService();
    const pruned = await service.runGcForLink('non-existent');
    expect(pruned).toBe(false);
  });
});
