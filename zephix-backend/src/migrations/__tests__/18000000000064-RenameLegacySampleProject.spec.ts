import { RenameLegacyWelcomeToZephixSampleProject18000000000064 } from '../18000000000064-RenameLegacyWelcomeToZephixSampleProject';

describe('Migration 18000000000064 — rename legacy sample project title', () => {
  it('runs parameterized UPDATE for idempotent rename', async () => {
    const queries: string[] = [];
    const params: unknown[][] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string, p?: unknown[]) => {
        queries.push(sql);
        if (p) params.push(p);
      }),
    };

    const migration = new RenameLegacyWelcomeToZephixSampleProject18000000000064();
    await migration.up(mockQueryRunner as any);

    expect(queries.some((q) => q.includes('UPDATE projects'))).toBe(true);
    expect(params[0]).toEqual([
      'Sample: Zephix walkthrough',
      'Welcome to Zephix',
    ]);
  });

  it('down reverses the title for rollback', async () => {
    const params: unknown[][] = [];
    const mockQueryRunner = {
      query: jest.fn(async (_sql: string, p?: unknown[]) => {
        if (p) params.push(p);
      }),
    };

    const migration = new RenameLegacyWelcomeToZephixSampleProject18000000000064();
    await migration.down(mockQueryRunner as any);

    expect(params[0]).toEqual([
      'Welcome to Zephix',
      'Sample: Zephix walkthrough',
    ]);
  });
});
