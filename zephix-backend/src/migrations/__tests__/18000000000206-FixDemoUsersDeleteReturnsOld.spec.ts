import { FixDemoUsersDeleteReturnsOld18000000000206 } from '../18000000000206-FixDemoUsersDeleteReturnsOld';

/**
 * SEC-1 — the migration must replace zephix_protect_demo_users() so a BEFORE
 * DELETE returns OLD (delete proceeds) while the four demo emails still hard-
 * block on DELETE via RAISE EXCEPTION (honest error, never a silent skip).
 * Behavioral proof (demo→raise, normal→actually deletes) runs live in Stage 2.
 */
describe('Migration 18000000000206 — FixDemoUsersDeleteReturnsOld', () => {
  const runUp = async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };
    await new FixDemoUsersDeleteReturnsOld18000000000206().up(
      mockQueryRunner as any,
    );
    return queries.join('\n');
  };

  it('replaces the function so DELETE returns OLD (not NEW)', async () => {
    const sql = await runUp();
    expect(sql).toContain('CREATE OR REPLACE FUNCTION zephix_protect_demo_users');
    // The fix: DELETE branch returns OLD so the row is actually removed.
    expect(sql).toMatch(/IF\s+TG_OP\s*=\s*'DELETE'\s+THEN\s+RETURN OLD;/);
  });

  it('keeps the four demo emails undeletable via an explicit RAISE (no silent skip)', async () => {
    const sql = await runUp();
    for (const email of [
      'demo@zephix.ai',
      'admin@zephix.ai',
      'member@zephix.ai',
      'guest@zephix.ai',
    ]) {
      expect(sql).toContain(email);
    }
    expect(sql).toContain(`RAISE EXCEPTION 'Deletion blocked for demo users'`);
  });

  it('down restores the prior version for rollback', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };
    await new FixDemoUsersDeleteReturnsOld18000000000206().down(
      mockQueryRunner as any,
    );
    const sql = queries.join('\n');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION zephix_protect_demo_users');
    // The prior (reverted) version ended with the fail-silent bare RETURN NEW.
    expect(sql).not.toMatch(/TG_OP\s*=\s*'DELETE'\s+THEN\s+RETURN OLD;/);
  });
});
