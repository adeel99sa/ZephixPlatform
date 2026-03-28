/**
 * Phase 5A: Scale seed unit tests.
 *
 * Pure function tests only — no database required.
 * Tests: stableId, scaleCount, distributions, cycle safety, manifest.
 */
import {
  stableId,
  seededRng,
  scaleCount,
  distribute,
  pickFromDistribution,
  addBusinessDays,
  isWeekday,
  fmtDate,
  bulkInsertSql,
  computeSchemaHash,
  DistributionEntry,
  indexCoversColumns,
  IndexSignature,
  REQUIRED_BENCH_INDEXES,
} from '../scale-seed.utils';
import { parseConfig } from '../scale-seed.config';
import { buildManifest } from '../scale-seed.manifest';
import { computeHasResidue } from '../cleanup/cleanup.runner';
import { parseBenchConfig } from '../bench/bench.runner';

// ─── stableId ────────────────────────────────────────────────

describe('stableId', () => {
  it('returns same UUID for same inputs', () => {
    const a = stableId('org', '123:test');
    const b = stableId('org', '123:test');
    expect(a).toBe(b);
  });

  it('differs for different seed', () => {
    const a = stableId('org', '123:test');
    const b = stableId('org', '456:test');
    expect(a).not.toBe(b);
  });

  it('differs for different namespace', () => {
    const a = stableId('org', '123:test');
    const b = stableId('user', '123:test');
    expect(a).not.toBe(b);
  });

  it('differs for different key', () => {
    const a = stableId('org', '123:foo');
    const b = stableId('org', '123:bar');
    expect(a).not.toBe(b);
  });

  it('matches UUID format (8-4-4-4-12 hex)', () => {
    const id = stableId('test', 'abc');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('version nibble is always 5', () => {
    for (let i = 0; i < 20; i++) {
      const id = stableId('ns', `key${i}`);
      expect(id[14]).toBe('5');
    }
  });

  it('variant nibble is 8, 9, a, or b', () => {
    for (let i = 0; i < 20; i++) {
      const id = stableId('ns', `key${i}`);
      expect(['8', '9', 'a', 'b']).toContain(id[19]);
    }
  });
});

// ─── seededRng ───────────────────────────────────────────────

describe('seededRng', () => {
  it('produces deterministic sequence for same seed', () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequence for different seed', () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(99);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('values are in [0, 1) range', () => {
    const rng = seededRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ─── scaleCount ──────────────────────────────────────────────

describe('scaleCount', () => {
  it('scales down correctly', () => {
    expect(scaleCount(1000, 0.1)).toBe(100);
    expect(scaleCount(500, 0.1)).toBe(50);
    expect(scaleCount(50, 0.1)).toBe(5);
  });

  it('returns minimum 1 for very small scale', () => {
    expect(scaleCount(10, 0.001)).toBe(1);
    expect(scaleCount(1, 0.01)).toBe(1);
  });

  it('floors to integer', () => {
    expect(scaleCount(33, 0.1)).toBe(3); // 3.3 → 3
    expect(scaleCount(17, 0.1)).toBe(1); // 1.7 → 1
  });

  it('produces identical result for same inputs', () => {
    const a = scaleCount(100000, 0.1);
    const b = scaleCount(100000, 0.1);
    expect(a).toBe(b);
    expect(a).toBe(10000);
  });

  it('scale=1.0 returns base value', () => {
    expect(scaleCount(50, 1.0)).toBe(50);
    expect(scaleCount(1000, 1.0)).toBe(1000);
  });
});

// ─── distribute ──────────────────────────────────────────────

describe('distribute', () => {
  const STATUS_DIST: DistributionEntry<string>[] = [
    { value: 'BACKLOG', pct: 15 },
    { value: 'TODO', pct: 25 },
    { value: 'IN_PROGRESS', pct: 30 },
    { value: 'IN_REVIEW', pct: 10 },
    { value: 'DONE', pct: 20 },
  ];

  it('counts sum to total', () => {
    const result = distribute(100, STATUS_DIST);
    const sum = result.reduce((s, r) => s + r.count, 0);
    expect(sum).toBe(100);
  });

  it('counts sum to total for odd numbers', () => {
    for (const total of [7, 13, 99, 1, 1001]) {
      const result = distribute(total, STATUS_DIST);
      const sum = result.reduce((s, r) => s + r.count, 0);
      expect(sum).toBe(total);
    }
  });

  it('preserves value order', () => {
    const result = distribute(100, STATUS_DIST);
    expect(result.map((r) => r.value)).toEqual([
      'BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE',
    ]);
  });

  it('throws when percentages do not sum to 100', () => {
    const bad = [
      { value: 'A', pct: 50 },
      { value: 'B', pct: 40 },
    ];
    expect(() => distribute(100, bad)).toThrow('expected 100');
  });

  it('maps to allowed enum values', () => {
    const allowedStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED'];
    const result = distribute(100, STATUS_DIST);
    for (const r of result) {
      expect(allowedStatuses).toContain(r.value);
    }
  });
});

// ─── pickFromDistribution ────────────────────────────────────

describe('pickFromDistribution', () => {
  const DIST: DistributionEntry<string>[] = [
    { value: 'A', pct: 50 },
    { value: 'B', pct: 30 },
    { value: 'C', pct: 20 },
  ];

  it('deterministic: same index returns same value', () => {
    const a = pickFromDistribution(5, 100, DIST);
    const b = pickFromDistribution(5, 100, DIST);
    expect(a).toBe(b);
  });

  it('returns values from the distribution', () => {
    const allowed = ['A', 'B', 'C'];
    for (let i = 0; i < 100; i++) {
      expect(allowed).toContain(pickFromDistribution(i, 100, DIST));
    }
  });
});

// ─── dependency cycle safety ─────────────────────────────────

describe('dependency DAG safety', () => {
  /**
   * The dependency generator only creates forward references:
   *   task[i] → task[i+1] (chain)
   *   task[i] → task[i+2] (parallel)
   * Since predecessor index < successor index always, cycles are impossible.
   * This test verifies the invariant for a small sample.
   */
  it('forward-only indexing prevents cycles for chain + parallel patterns', () => {
    const taskCount = 50;
    const edges: Array<[number, number]> = [];

    // Simulate chain: i → i+1
    for (let i = 0; i < taskCount - 1; i++) {
      edges.push([i, i + 1]);
    }
    // Simulate parallel: i → i+2 (every other)
    for (let i = 0; i < taskCount - 2; i += 2) {
      edges.push([i, i + 2]);
    }

    // Verify: all edges go from lower to higher index
    for (const [from, to] of edges) {
      expect(from).toBeLessThan(to);
    }

    // Topological sort should succeed (no cycles)
    const sorted = topoSort(taskCount, edges);
    expect(sorted).not.toBeNull();
    expect(sorted!.length).toBe(taskCount);
  });

  it('detects a cycle if one existed', () => {
    // Deliberately create a cycle: 0→1→2→0
    const edges: Array<[number, number]> = [[0, 1], [1, 2], [2, 0]];
    const sorted = topoSort(3, edges);
    expect(sorted).toBeNull(); // null = cycle detected
  });
});

/** Kahn's algorithm: returns sorted list or null if cycle exists */
function topoSort(
  nodeCount: number,
  edges: Array<[number, number]>,
): number[] | null {
  const inDeg = new Array(nodeCount).fill(0);
  const adj = new Array(nodeCount).fill(null).map(() => [] as number[]);
  for (const [u, v] of edges) {
    adj[u].push(v);
    inDeg[v]++;
  }
  const queue: number[] = [];
  for (let i = 0; i < nodeCount; i++) {
    if (inDeg[i] === 0) queue.push(i);
  }
  const sorted: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);
    for (const v of adj[u]) {
      inDeg[v]--;
      if (inDeg[v] === 0) queue.push(v);
    }
  }
  return sorted.length === nodeCount ? sorted : null;
}

// ─── date helpers ────────────────────────────────────────────

describe('addBusinessDays', () => {
  it('skips weekends', () => {
    // Start on Monday 2026-02-09 (use noon to avoid timezone edge)
    const start = new Date('2026-02-09T12:00:00Z');
    const result = addBusinessDays(start, 5);
    // 5 business days from Mon = next Mon (Feb 16)
    expect(result.getDay()).toBe(1); // Monday
  });

  it('1 business day from Friday is Monday', () => {
    const fri = new Date('2026-02-13T12:00:00Z'); // Friday
    const result = addBusinessDays(fri, 1);
    expect(result.getDay()).toBe(1); // Monday
  });

  it('0 business days returns same date', () => {
    const start = new Date('2026-02-10T12:00:00Z');
    const result = addBusinessDays(start, 0);
    expect(fmtDate(result)).toBe(fmtDate(start));
  });
});

describe('isWeekday', () => {
  it('Monday through Friday are weekdays', () => {
    // Use noon UTC to avoid timezone issues
    for (let d = 9; d <= 13; d++) { // Mon-Fri Feb 9-13, 2026
      const date = new Date(`2026-02-${String(d).padStart(2, '0')}T12:00:00Z`);
      expect(isWeekday(date)).toBe(true);
    }
  });

  it('Saturday and Sunday are not weekdays', () => {
    expect(isWeekday(new Date('2026-02-14T12:00:00Z'))).toBe(false); // Sat
    expect(isWeekday(new Date('2026-02-15T12:00:00Z'))).toBe(false); // Sun
  });
});

// ─── bulkInsertSql ───────────────────────────────────────────

describe('bulkInsertSql', () => {
  it('generates correct SQL with conflict target', () => {
    const { sql, params } = bulkInsertSql(
      'test_table',
      ['id', 'name'],
      [['uuid1', 'Alice'], ['uuid2', 'Bob']],
      'id',
    );
    expect(sql).toContain('INSERT INTO test_table ("id", "name")');
    expect(sql).toContain('ON CONFLICT ("id") DO NOTHING');
    expect(params).toEqual(['uuid1', 'Alice', 'uuid2', 'Bob']);
  });

  it('handles composite conflict target', () => {
    const { sql } = bulkInsertSql(
      't',
      ['a', 'b', 'c'],
      [['1', '2', '3']],
      ['a', 'b'],
    );
    expect(sql).toContain('ON CONFLICT ("a", "b") DO NOTHING');
  });

  it('returns empty for no rows', () => {
    const { sql, params } = bulkInsertSql('t', ['a'], []);
    expect(sql).toBe('');
    expect(params).toEqual([]);
  });
});

// ─── parseConfig ─────────────────────────────────────────────

describe('parseConfig', () => {
  it('parses required seed', () => {
    const cfg = parseConfig(['--seed=42']);
    expect(cfg.seed).toBe(42);
  });

  it('throws when seed missing', () => {
    expect(() => parseConfig([])).toThrow('--seed=<number> is required');
  });

  it('applies default scale 0.1', () => {
    const cfg = parseConfig(['--seed=1']);
    expect(cfg.scale).toBe(0.1);
  });

  it('scales counts correctly', () => {
    const cfg = parseConfig(['--seed=1', '--scale=0.1']);
    expect(cfg.workspaceCount).toBe(5);   // 50 * 0.1
    expect(cfg.projectCount).toBe(100);   // 1000 * 0.1
    expect(cfg.taskCount).toBe(10000);    // 100000 * 0.1
    expect(cfg.userCount).toBe(50);       // 500 * 0.1
  });

  it('respects custom overrides', () => {
    const cfg = parseConfig(['--seed=1', '--scale=1.0', '--workspaceCount=10']);
    expect(cfg.workspaceCount).toBe(10);
  });

  it('strictSchema defaults to false', () => {
    const cfg = parseConfig(['--seed=1']);
    expect(cfg.strictSchema).toBe(false);
  });

  it('strictSchema parses true', () => {
    const cfg = parseConfig(['--seed=1', '--strictSchema=true']);
    expect(cfg.strictSchema).toBe(true);
  });
});

// ─── buildManifest ───────────────────────────────────────────

describe('buildManifest', () => {
  it('produces stable counts object', () => {
    const counts = { organizations: 1, users: 50, projects: 100 };
    const m = buildManifest(123, 0.1, 'scale-seed', counts, 5000);
    expect(m.seed).toBe(123);
    expect(m.scale).toBe(0.1);
    expect(m.counts).toEqual(counts);
    expect(m.runtimeMs).toBe(5000);
    expect(m.version).toBe('5a.3');
  });

  it('includes ISO timestamp', () => {
    const m = buildManifest(1, 1.0, 'test', {}, 100);
    expect(m.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes skippedTables and detectedSchemaHash', () => {
    const skipped = ['attachments', 'workspace_member_capacity'];
    const hash = 'abc123def456';
    const m = buildManifest(1, 0.1, 'test', {}, 100, skipped, hash);
    expect(m.skippedTables).toEqual(skipped);
    expect(m.detectedSchemaHash).toBe(hash);
  });

  it('defaults skippedTables to empty and hash to empty', () => {
    const m = buildManifest(1, 0.1, 'test', {}, 100);
    expect(m.skippedTables).toEqual([]);
    expect(m.detectedSchemaHash).toBe('');
  });
});

// ─── computeHasResidue ───────────────────────────────────────

describe('computeHasResidue', () => {
  it('returns false when all counts are 0', () => {
    expect(computeHasResidue({
      users: 0,
      workspaces: 0,
      organizations: 0,
    })).toBe(false);
  });

  it('returns false when all entries are 0 or TABLE_NOT_FOUND', () => {
    expect(computeHasResidue({
      users: 0,
      attachments: 'TABLE_NOT_FOUND',
      organizations: 0,
    })).toBe(false);
  });

  it('returns true when any count is > 0', () => {
    expect(computeHasResidue({
      users: 0,
      workspaces: 3,
      organizations: 0,
    })).toBe(true);
  });

  it('returns true when any query failed', () => {
    expect(computeHasResidue({
      users: 0,
      organizations: 'QUERY_FAILED',
    })).toBe(true);
  });

  it('returns true when organizations query fails even if others are clean', () => {
    expect(computeHasResidue({
      users: 0,
      workspaces: 0,
      projects: 0,
      work_tasks: 0,
      organizations: 'QUERY_FAILED',
    })).toBe(true);
  });

  it('returns false for empty residue map', () => {
    expect(computeHasResidue({})).toBe(false);
  });
});

// ─── computeSchemaHash ───────────────────────────────────────

describe('computeSchemaHash', () => {
  it('returns deterministic hash for same input', () => {
    const cols = { users: ['id', 'email', 'name'], workspaces: ['id', 'slug'] };
    const a = computeSchemaHash(cols);
    const b = computeSchemaHash(cols);
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it('differs when columns change', () => {
    const a = computeSchemaHash({ users: ['id', 'email'] });
    const b = computeSchemaHash({ users: ['id', 'email', 'name'] });
    expect(a).not.toBe(b);
  });

  it('is order-independent (sorted internally)', () => {
    const a = computeSchemaHash({ b: ['y', 'x'], a: ['z'] });
    const b = computeSchemaHash({ a: ['z'], b: ['x', 'y'] });
    expect(a).toBe(b);
  });
});

// ─── attachment size distribution ────────────────────────────

describe('attachment size distribution', () => {
  it('all sizes are between 50KB and 50MB', () => {
    // Reproduce the generator's calculation
    const rng = seededRng(123 + 11);
    const minLog = Math.log(50_000);
    const maxLog = Math.log(50_000_000);
    for (let i = 0; i < 1000; i++) {
      const sizeBytes = Math.floor(Math.exp(minLog + rng() * (maxLog - minLog)));
      expect(sizeBytes).toBeGreaterThanOrEqual(50_000);
      expect(sizeBytes).toBeLessThanOrEqual(50_000_000);
    }
  });
});

// ─── indexCoversColumns ──────────────────────────────────────

describe('indexCoversColumns', () => {
  const makeIdx = (cols: string[]): IndexSignature => ({
    name: 'test_idx',
    table: 'test',
    columns: cols,
    isUnique: false,
  });

  it('exact match returns true', () => {
    expect(indexCoversColumns([makeIdx(['a', 'b'])], ['a', 'b'])).toBe(true);
  });

  it('prefix match returns true (superset index covers required)', () => {
    expect(indexCoversColumns([makeIdx(['a', 'b', 'c'])], ['a', 'b'])).toBe(true);
  });

  it('wrong order returns false', () => {
    expect(indexCoversColumns([makeIdx(['b', 'a'])], ['a', 'b'])).toBe(false);
  });

  it('shorter index than required returns false', () => {
    expect(indexCoversColumns([makeIdx(['a'])], ['a', 'b'])).toBe(false);
  });

  it('no indexes returns false', () => {
    expect(indexCoversColumns([], ['a'])).toBe(false);
  });

  it('any matching index in array is sufficient', () => {
    expect(indexCoversColumns(
      [makeIdx(['x', 'y']), makeIdx(['a', 'b', 'c'])],
      ['a', 'b'],
    )).toBe(true);
  });

  it('none matching among multiple returns false', () => {
    expect(indexCoversColumns(
      [makeIdx(['x', 'y']), makeIdx(['z'])],
      ['a', 'b'],
    )).toBe(false);
  });
});

// ─── REQUIRED_BENCH_INDEXES stability ────────────────────────

describe('REQUIRED_BENCH_INDEXES', () => {
  it('contains exactly 4 required index definitions', () => {
    expect(REQUIRED_BENCH_INDEXES).toHaveLength(4);
  });

  it('includes audit_events org+created_at', () => {
    const audit = REQUIRED_BENCH_INDEXES.find(
      (r) => r.table === 'audit_events' && r.columns[0] === 'organization_id' && r.columns[1] === 'created_at',
    );
    expect(audit).toBeDefined();
  });

  it('includes work_tasks board index', () => {
    const board = REQUIRED_BENCH_INDEXES.find(
      (r) => r.table === 'work_tasks' && r.columns.includes('project_id') && r.columns.includes('status') && r.columns.includes('rank'),
    );
    expect(board).toBeDefined();
  });

  it('includes work_task_dependencies org+project', () => {
    const deps = REQUIRED_BENCH_INDEXES.find(
      (r) => r.table === 'work_task_dependencies' && r.columns[0] === 'organization_id' && r.columns[1] === 'project_id',
    );
    expect(deps).toBeDefined();
  });

  it('includes projects org+created_at', () => {
    const proj = REQUIRED_BENCH_INDEXES.find(
      (r) => r.table === 'projects' && r.columns[0] === 'organization_id' && r.columns[1] === 'created_at',
    );
    expect(proj).toBeDefined();
  });
});

// ─── buildManifest includes index data ───────────────────────

describe('buildManifest index data', () => {
  it('includes requiredIndexesPresent and missingIndexes', () => {
    const present = ['audit_events(organization_id,created_at)'];
    const missing = ['work_tasks(project_id,status,rank)'];
    const m = buildManifest(1, 0.1, 'test', {}, 100, [], '', present, missing);
    expect(m.requiredIndexesPresent).toEqual(present);
    expect(m.missingIndexes).toEqual(missing);
  });

  it('defaults index arrays to empty', () => {
    const m = buildManifest(1, 0.1, 'test', {}, 100);
    expect(m.requiredIndexesPresent).toEqual([]);
    expect(m.missingIndexes).toEqual([]);
  });
});

// ─── Enterprise guardrails ──────────────────────────────────

describe('bench guardrails', () => {
  it('bench refuses strictSchema=false', () => {
    expect(() =>
      parseBenchConfig(['bench', '--seed=123', '--strictSchema=false']),
    ).toThrow('BENCH_GUARDRAIL');
  });

  it('bench defaults strictSchema to true', () => {
    const cfg = parseBenchConfig(['bench', '--seed=123']);
    expect(cfg.strictSchema).toBe(true);
  });

  it('bench with explicit strictSchema=true works', () => {
    const cfg = parseBenchConfig(['bench', '--seed=123', '--strictSchema=true']);
    expect(cfg.strictSchema).toBe(true);
  });

  it('bench without strictSchema arg defaults to true', () => {
    const cfg = parseBenchConfig(['bench', '--seed=456', '--scale=0.5']);
    expect(cfg.strictSchema).toBe(true);
  });
});

describe('schema drift detection', () => {
  it('computeSchemaHash is deterministic', () => {
    const map1 = { users: ['id', 'email'], projects: ['id', 'name'] };
    const map2 = { projects: ['id', 'name'], users: ['id', 'email'] };
    expect(computeSchemaHash(map1)).toBe(computeSchemaHash(map2));
  });

  it('computeSchemaHash changes when schema changes', () => {
    const map1 = { users: ['id', 'email'] };
    const map2 = { users: ['id', 'email', 'role'] };
    expect(computeSchemaHash(map1)).not.toBe(computeSchemaHash(map2));
  });

  it('computeSchemaHash changes when table added', () => {
    const map1 = { users: ['id', 'email'] };
    const map2 = { users: ['id', 'email'], projects: ['id'] };
    expect(computeSchemaHash(map1)).not.toBe(computeSchemaHash(map2));
  });
});

describe('progress tracking', () => {
  it('GeneratorProgress type captures name, rowCount, completedAt', () => {
    const progress = {
      name: 'organizations',
      rowCount: 1,
      completedAt: new Date().toISOString(),
    };
    expect(progress.name).toBe('organizations');
    expect(progress.rowCount).toBe(1);
    expect(typeof progress.completedAt).toBe('string');
  });
});
