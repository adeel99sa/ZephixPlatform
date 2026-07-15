import { resolveCapabilities, VALID_CAPABILITY_KEYS } from '../capabilities.types';
import { ProjectCapabilitiesService } from '../project-capabilities.service';
import { NotFoundException } from '@nestjs/common';

// ── resolveCapabilities unit tests ────────────────────────────────────────────

describe('resolveCapabilities — absent-key defaults', () => {
  it('returns waterfall-shaped defaults when capabilities is {}', () => {
    const result = resolveCapabilities({});
    expect(result).toEqual({
      use_phases: true,
      use_iterations: false,
      use_gates: true,
      use_wip_limits: false,
      use_complexity_mode: true,
    });
  });

  it('returns waterfall-shaped defaults when capabilities is null', () => {
    const result = resolveCapabilities(null);
    expect(result).toEqual({
      use_phases: true,
      use_iterations: false,
      use_gates: true,
      use_wip_limits: false,
      use_complexity_mode: true,
    });
  });

  it('returns waterfall-shaped defaults when capabilities is undefined', () => {
    const result = resolveCapabilities(undefined);
    expect(result).toEqual({
      use_phases: true,
      use_iterations: false,
      use_gates: true,
      use_wip_limits: false,
      use_complexity_mode: true,
    });
  });

  it('respects stored use_iterations:true (agile-family backfill)', () => {
    const result = resolveCapabilities({ use_iterations: true });
    expect(result.use_iterations).toBe(true);
    // other keys still get defaults
    expect(result.use_phases).toBe(true);
    expect(result.use_gates).toBe(true);
    expect(result.use_wip_limits).toBe(false);
  });

  it('respects stored use_phases:false', () => {
    expect(resolveCapabilities({ use_phases: false }).use_phases).toBe(false);
  });

  it('respects stored use_gates:false', () => {
    expect(resolveCapabilities({ use_gates: false }).use_gates).toBe(false);
  });

  it('respects stored use_wip_limits:true', () => {
    expect(resolveCapabilities({ use_wip_limits: true }).use_wip_limits).toBe(true);
  });

  it('ignores unknown keys in raw — only canonical keys in output', () => {
    const result = resolveCapabilities({
      use_iterations: true,
      use_unknown_key: true,
    } as Record<string, unknown>);
    expect(Object.keys(result)).toEqual([
      'use_phases',
      'use_iterations',
      'use_gates',
      'use_wip_limits',
      'use_complexity_mode',
    ]);
    expect((result as unknown as Record<string, unknown>).use_unknown_key).toBeUndefined();
  });
});

// ── VALID_CAPABILITY_KEYS vocabulary ─────────────────────────────────────────

describe('VALID_CAPABILITY_KEYS', () => {
  it('contains exactly the 5 canonical keys', () => {
    expect(VALID_CAPABILITY_KEYS.size).toBe(5);
    expect(VALID_CAPABILITY_KEYS.has('use_phases')).toBe(true);
    expect(VALID_CAPABILITY_KEYS.has('use_iterations')).toBe(true);
    expect(VALID_CAPABILITY_KEYS.has('use_gates')).toBe(true);
    expect(VALID_CAPABILITY_KEYS.has('use_wip_limits')).toBe(true);
    expect(VALID_CAPABILITY_KEYS.has('use_complexity_mode')).toBe(true);
  });

  it('does not contain unknown keys', () => {
    expect(VALID_CAPABILITY_KEYS.has('use_unknown' as never)).toBe(false);
    expect(VALID_CAPABILITY_KEYS.has('use_phases_v2' as never)).toBe(false);
  });
});

// ── ProjectCapabilitiesService unit tests ─────────────────────────────────────

const makeProjectRepo = (overrides: Partial<{ findOne: jest.Mock; update: jest.Mock }> = {}) => ({
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  ...overrides,
});

// SKIP-1: patch() now requires an actor (for the capability-toggle receipt).
const ACTOR = { userId: 'actor-1', platformRole: 'MEMBER' } as const;
const makeAudit = () => ({ record: jest.fn().mockResolvedValue({}) });

const service = (repo = makeProjectRepo(), audit = makeAudit()) =>
  new ProjectCapabilitiesService(repo as any, audit as any);

describe('ProjectCapabilitiesService.get', () => {
  it('throws NotFoundException when project not found', async () => {
    const repo = makeProjectRepo({ findOne: jest.fn().mockResolvedValue(null) });
    await expect(
      service(repo).get('proj-1', 'ws-1', 'org-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns resolved capabilities with absent-key defaults', async () => {
    const repo = makeProjectRepo({
      findOne: jest.fn().mockResolvedValue({ id: 'proj-1', capabilities: {} }),
    });
    const result = await service(repo).get('proj-1', 'ws-1', 'org-1');
    expect(result.use_iterations).toBe(false);
    expect(result.use_phases).toBe(true);
  });

  it('returns stored use_iterations:true for agile project', async () => {
    const repo = makeProjectRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        capabilities: { use_iterations: true },
      }),
    });
    const result = await service(repo).get('proj-1', 'ws-1', 'org-1');
    expect(result.use_iterations).toBe(true);
  });
});

describe('ProjectCapabilitiesService.patch', () => {
  it('throws NotFoundException when project not found', async () => {
    const repo = makeProjectRepo({ findOne: jest.fn().mockResolvedValue(null) });
    await expect(
      service(repo).patch('proj-1', 'ws-1', 'org-1', { use_iterations: true }, ACTOR),
    ).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('merges patch onto existing capabilities — does not clobber other keys', async () => {
    const repo = makeProjectRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        capabilities: { use_gates: false },
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });
    const result = await service(repo).patch('proj-1', 'ws-1', 'org-1', {
      use_iterations: true,
    }, ACTOR);
    // use_iterations set to true
    expect(result.use_iterations).toBe(true);
    // update called with merged object preserving use_gates:false
    const [, payload] = repo.update.mock.calls[0];
    expect(payload.capabilities.use_gates).toBe(false);
    expect(payload.capabilities.use_iterations).toBe(true);
  });

  it('returns resolved capabilities (with absent-key defaults applied)', async () => {
    const repo = makeProjectRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        capabilities: {},
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });
    const result = await service(repo).patch('proj-1', 'ws-1', 'org-1', {
      use_wip_limits: true,
    }, ACTOR);
    expect(result.use_wip_limits).toBe(true);
    expect(result.use_phases).toBe(true);  // default applied
  });

  it('no-op patch (empty dto) returns current resolved capabilities', async () => {
    const repo = makeProjectRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        capabilities: { use_iterations: true },
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });
    const result = await service(repo).patch('proj-1', 'ws-1', 'org-1', {}, ACTOR);
    expect(result.use_iterations).toBe(true);
  });
});

describe('SKIP-1 (Type A) — use_gates toggle receipt', () => {
  const projWithGates = (use_gates: boolean) =>
    makeProjectRepo({
      findOne: jest.fn().mockResolvedValue({ id: 'proj-1', capabilities: { use_gates } }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });

  it('toggling use_gates off then on → exactly TWO audit rows, correct actor + before/after', async () => {
    // OFF: gates currently on → set false
    const audit1 = makeAudit();
    await service(projWithGates(true), audit1).patch(
      'proj-1', 'ws-1', 'org-1', { use_gates: false }, ACTOR,
    );
    // ON: gates currently off → set true
    const audit2 = makeAudit();
    await service(projWithGates(false), audit2).patch(
      'proj-1', 'ws-1', 'org-1', { use_gates: true }, ACTOR,
    );

    expect(audit1.record).toHaveBeenCalledTimes(1);
    expect(audit2.record).toHaveBeenCalledTimes(1);

    const off = audit1.record.mock.calls[0][0];
    expect(off.actorUserId).toBe('actor-1');
    expect(off.action).toBe('governance_evaluate');
    expect(off.metadata.governanceType).toBe('CAPABILITY_TOGGLED');
    expect(off.metadata.changedCapabilities).toContain('use_gates');
    expect(off.before.capabilities.use_gates).toBe(true);
    expect(off.after.capabilities.use_gates).toBe(false);
    expect(off.entityId).toBe('proj-1');

    const on = audit2.record.mock.calls[0][0];
    expect(on.before.capabilities.use_gates).toBe(false);
    expect(on.after.capabilities.use_gates).toBe(true);
  });

  it('idempotent no-op (use_gates already false → set false) → ZERO audit rows', async () => {
    const audit = makeAudit();
    await service(projWithGates(false), audit).patch(
      'proj-1', 'ws-1', 'org-1', { use_gates: false }, ACTOR,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('missing actor platform role → throws (no actor-less governance state change)', async () => {
    const audit = makeAudit();
    await expect(
      service(projWithGates(true), audit).patch(
        'proj-1', 'ws-1', 'org-1', { use_gates: false },
        { userId: 'actor-1', platformRole: '' },
      ),
    ).rejects.toThrow(/CAPABILITY_TOGGLE_AUDIT_ACTOR_MISSING|platform role/i);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
