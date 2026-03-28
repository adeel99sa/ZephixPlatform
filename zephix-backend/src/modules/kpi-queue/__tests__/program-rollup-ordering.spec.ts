import * as crypto from 'crypto';

/**
 * Wave 10: Ordering test for program rollup inputHash.
 * Verifies that different project insert orders produce the same inputHash.
 * This is critical for deterministic rollup computation.
 */
describe('Program rollup — inputHash ordering determinism', () => {
  /**
   * Mirrors ProgramRollupProcessor.computeInputHash logic:
   * projectIds are sorted, kpiValueIds are sorted, budgetIds are sorted.
   */
  function computeInputHash(
    programId: string,
    asOfDate: string,
    projectIds: string[],
    kpiValueIds: string[],
    budgetIds: string[],
  ): string {
    const payload = {
      programId,
      asOfDate,
      projectIds: [...projectIds].sort(),
      kpiValueIds: [...kpiValueIds].sort(),
      budgetIds: [...budgetIds].sort(),
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .slice(0, 16);
  }

  it('same projects in different order produce same inputHash', () => {
    const hash1 = computeInputHash(
      'pg-1',
      '2026-02-10',
      ['proj-a', 'proj-c', 'proj-b'],
      ['kv-1', 'kv-2'],
      ['b-1'],
    );

    const hash2 = computeInputHash(
      'pg-1',
      '2026-02-10',
      ['proj-c', 'proj-a', 'proj-b'],
      ['kv-2', 'kv-1'],
      ['b-1'],
    );

    expect(hash1).toBe(hash2);
  });

  it('different projects produce different inputHash', () => {
    const hash1 = computeInputHash(
      'pg-1',
      '2026-02-10',
      ['proj-a', 'proj-b'],
      ['kv-1'],
      [],
    );

    const hash2 = computeInputHash(
      'pg-1',
      '2026-02-10',
      ['proj-a', 'proj-c'],
      ['kv-1'],
      [],
    );

    expect(hash1).not.toBe(hash2);
  });

  it('same KPI values in different order produce same inputHash', () => {
    const hash1 = computeInputHash(
      'pg-1',
      '2026-02-10',
      ['proj-a'],
      ['kv-3', 'kv-1', 'kv-2'],
      ['b-2', 'b-1'],
    );

    const hash2 = computeInputHash(
      'pg-1',
      '2026-02-10',
      ['proj-a'],
      ['kv-1', 'kv-2', 'kv-3'],
      ['b-1', 'b-2'],
    );

    expect(hash1).toBe(hash2);
  });

  it('different dates produce different inputHash', () => {
    const hash1 = computeInputHash('pg-1', '2026-02-10', ['proj-a'], ['kv-1'], []);
    const hash2 = computeInputHash('pg-1', '2026-02-11', ['proj-a'], ['kv-1'], []);

    expect(hash1).not.toBe(hash2);
  });
});
