/**
 * Phase 5A: Scale seed utilities.
 *
 * Deterministic ID generation, date math, and distribution helpers.
 * All functions are pure and produce identical output for identical input.
 */
import { createHash } from 'crypto';

// ─── Deterministic UUID ──────────────────────────────────────

/**
 * Generate a deterministic UUID v5-style ID from namespace + key.
 * Uses SHA-1 hash formatted to match standard UUID format.
 * Same namespace + key always produces the same UUID.
 */
export function stableId(namespace: string, key: string): string {
  const hash = createHash('sha1')
    .update(`${namespace}:${key}`)
    .digest('hex');

  // Format as UUID: 8-4-4-4-12, with version nibble = 5
  const timeLow = hash.substring(0, 8);
  const timeMid = hash.substring(8, 12);
  const timeHi = '5' + hash.substring(13, 16); // version 5
  const variant =
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, '0') + hash.substring(18, 20);
  const node = hash.substring(20, 32);

  return `${timeLow}-${timeMid}-${timeHi}-${variant}-${node}`;
}

// ─── Seeded PRNG ─────────────────────────────────────────────

/**
 * Simple seeded PRNG (xoshiro128**-inspired).
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function seededRng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000000) / 1000000;
  };
}

// ─── Scale math ──────────────────────────────────────────────

/** Scale a base count by a multiplier, floor to integer, minimum 1. */
export function scaleCount(base: number, scale: number): number {
  return Math.max(1, Math.floor(base * scale));
}

// ─── Distribution helpers ────────────────────────────────────

export interface DistributionEntry<T> {
  value: T;
  pct: number; // percentage 0–100
}

/**
 * Distribute `total` items across buckets by percentage.
 * Returns an array of { value, count } where counts sum exactly to total.
 * Remainders are distributed round-robin to the largest buckets.
 */
export function distribute<T>(
  total: number,
  entries: DistributionEntry<T>[],
): Array<{ value: T; count: number }> {
  const pctSum = entries.reduce((s, e) => s + e.pct, 0);
  if (Math.abs(pctSum - 100) > 0.01) {
    throw new Error(`Distribution percentages sum to ${pctSum}, expected 100`);
  }

  const result = entries.map((e) => ({
    value: e.value,
    count: Math.floor((total * e.pct) / 100),
  }));

  let assigned = result.reduce((s, r) => s + r.count, 0);
  let i = 0;
  while (assigned < total) {
    result[i % result.length].count++;
    assigned++;
    i++;
  }

  return result;
}

/**
 * Pick a value from a distribution for a given index.
 * Deterministic: same index always returns same value.
 */
export function pickFromDistribution<T>(
  index: number,
  total: number,
  entries: DistributionEntry<T>[],
): T {
  const dist = distribute(total, entries);
  let cumulative = 0;
  for (const d of dist) {
    cumulative += d.count;
    if (index < cumulative) return d.value;
  }
  return dist[dist.length - 1].value;
}

// ─── Date helpers ────────────────────────────────────────────

/** Add business days (Mon-Fri) to a date. */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

/** Check if a date is a weekday. */
export function isWeekday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

/** Format date as YYYY-MM-DD. */
export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format date as ISO timestamp. */
export function fmtTs(d: Date): string {
  return d.toISOString();
}

// ─── Schema detection ────────────────────────────────────────

/**
 * Check if a table exists in the current database.
 */
export async function tableExists(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  tableName: string,
): Promise<boolean> {
  const rows = await ds.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName],
  );
  return rows.length > 0;
}

/**
 * Get the set of column names for a table.
 */
export async function getTableColumns(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  tableName: string,
): Promise<Set<string>> {
  const rows = await ds.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName],
  );
  return new Set(rows.map((r: any) => r.column_name));
}

// ─── Index detection ─────────────────────────────────────────

export interface IndexSignature {
  name: string;
  table: string;
  columns: string[];
  isUnique: boolean;
  whereClause?: string;
}

export interface RequiredIndex {
  table: string;
  columns: string[];
  description: string;
}

/**
 * Required composite indexes for benchmark accuracy.
 * If any are missing and strictSchema=true, seed/bench/ladder will fail fast.
 */
export const REQUIRED_BENCH_INDEXES: RequiredIndex[] = [
  { table: 'audit_events', columns: ['organization_id', 'created_at'], description: 'Admin audit viewer: ORDER BY created_at DESC' },
  { table: 'work_tasks', columns: ['project_id', 'status', 'rank'], description: 'Board column query' },
  { table: 'work_task_dependencies', columns: ['organization_id', 'project_id'], description: 'Gantt dependencies by project' },
  { table: 'projects', columns: ['organization_id', 'created_at'], description: 'Project list by org' },
];

/**
 * Parse a pg_indexes indexdef into an IndexSignature.
 */
function parseIndexDef(name: string, table: string, def: string): IndexSignature {
  // Extract columns from the USING btree (...) part
  const colMatch = def.match(/USING\s+\w+\s+\(([^)]+)\)/);
  const rawCols = colMatch ? colMatch[1] : '';
  const columns = rawCols
    .split(',')
    .map((c) =>
      c.trim()
        .replace(/^"/, '').replace(/"$/, '')   // remove quotes
        .replace(/\s+(DESC|ASC)$/i, '')        // remove sort direction
    )
    .filter((c) => c.length > 0);
  const isUnique = /UNIQUE\s+INDEX/i.test(def);
  const whereMatch = def.match(/WHERE\s+(.+)$/i);
  return { name, table, columns, isUnique, whereClause: whereMatch?.[1] };
}

/**
 * Get all indexes for a table from pg_indexes.
 */
export async function getTableIndexes(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  tableName: string,
): Promise<IndexSignature[]> {
  const rows = await ds.query(
    `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1 AND schemaname = 'public'`,
    [tableName],
  );
  return rows.map((r: any) => parseIndexDef(r.indexname, tableName, r.indexdef));
}

/**
 * Check if any index on the table has the required columns as a leading prefix.
 */
export function indexCoversColumns(indexes: IndexSignature[], requiredCols: string[]): boolean {
  return indexes.some((idx) => {
    if (idx.columns.length < requiredCols.length) return false;
    for (let i = 0; i < requiredCols.length; i++) {
      if (idx.columns[i] !== requiredCols[i]) return false;
    }
    return true;
  });
}

/**
 * Check all required bench indexes against the database.
 * Returns arrays of present and missing index requirements.
 */
export async function checkRequiredIndexes(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
): Promise<{ present: RequiredIndex[]; missing: RequiredIndex[]; indexesByTable: Record<string, IndexSignature[]> }> {
  const present: RequiredIndex[] = [];
  const missing: RequiredIndex[] = [];
  const indexesByTable: Record<string, IndexSignature[]> = {};

  for (const req of REQUIRED_BENCH_INDEXES) {
    const exists = await tableExists(ds, req.table);
    if (!exists) {
      missing.push(req);
      continue;
    }
    if (!indexesByTable[req.table]) {
      indexesByTable[req.table] = await getTableIndexes(ds, req.table);
    }
    if (indexCoversColumns(indexesByTable[req.table], req.columns)) {
      present.push(req);
    } else {
      missing.push(req);
    }
  }

  return { present, missing, indexesByTable };
}

// ─── Schema hash ─────────────────────────────────────────────

/**
 * Compute a deterministic hash of the detected schema for a set of tables.
 * Uses sha1 of sorted "table:col1,col2,..." lines.
 */
export function computeSchemaHash(
  tableColumns: Record<string, string[]>,
): string {
  const lines = Object.keys(tableColumns)
    .sort()
    .map((t) => `${t}:${tableColumns[t].sort().join(',')}`);
  return createHash('sha1').update(lines.join('\n')).digest('hex').slice(0, 16);
}

// ─── Batch insert helper ─────────────────────────────────────

/**
 * Build a bulk INSERT ... ON CONFLICT DO NOTHING query.
 * Returns { sql, params } for use with DataSource.query().
 *
 * @param table   Table name
 * @param columns Column names
 * @param rows    Array of row arrays matching column order
 * @param conflictTarget  Optional conflict column(s) for idempotency
 */
export function bulkInsertSql(
  table: string,
  columns: string[],
  rows: any[][],
  conflictTarget?: string | string[],
): { sql: string; params: any[] } {
  if (rows.length === 0) return { sql: '', params: [] };

  const params: any[] = [];
  const valueClauses: string[] = [];
  let paramIdx = 1;

  for (const row of rows) {
    const placeholders = row.map(() => `$${paramIdx++}`);
    valueClauses.push(`(${placeholders.join(', ')})`);
    params.push(...row);
  }

  // Quote column names to handle camelCase (Postgres lowercases unquoted identifiers)
  const colList = columns.map((c) => `"${c}"`).join(', ');
  let sql = `INSERT INTO ${table} (${colList}) VALUES ${valueClauses.join(', ')}`;

  if (conflictTarget) {
    const targets = Array.isArray(conflictTarget) ? conflictTarget : [conflictTarget];
    const quotedTargets = targets.map((c) => `"${c}"`).join(', ');
    sql += ` ON CONFLICT (${quotedTargets}) DO NOTHING`;
  }

  return { sql, params };
}

/**
 * Execute bulk inserts in batches.
 * Splits rows into chunks and inserts each with ON CONFLICT DO NOTHING.
 */
export async function batchInsert(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  table: string,
  columns: string[],
  rows: any[][],
  batchSize: number,
  conflictTarget?: string | string[],
  log?: (msg: string) => void,
): Promise<number> {
  // Postgres max params = 65535. Auto-cap batch size to stay under limit.
  const maxRowsPerBatch = Math.max(1, Math.floor(65000 / columns.length));
  const effectiveBatch = Math.min(batchSize, maxRowsPerBatch);
  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += effectiveBatch) {
    const chunk = rows.slice(offset, offset + effectiveBatch);
    const { sql, params } = bulkInsertSql(table, columns, chunk, conflictTarget);
    if (sql) {
      await ds.query(sql, params);
      inserted += chunk.length;
      if (log && inserted % (effectiveBatch * 10) === 0) {
        log(`  ${table}: ${inserted}/${rows.length} rows`);
      }
    }
  }
  return inserted;
}
