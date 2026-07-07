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

const service = (repo = makeProjectRepo()) =>
  new ProjectCapabilitiesService(repo as any);

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
      service(repo).patch('proj-1', 'ws-1', 'org-1', { use_iterations: true }),
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
    });
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
    });
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
    const result = await service(repo).patch('proj-1', 'ws-1', 'org-1', {});
    expect(result.use_iterations).toBe(true);
  });
});
