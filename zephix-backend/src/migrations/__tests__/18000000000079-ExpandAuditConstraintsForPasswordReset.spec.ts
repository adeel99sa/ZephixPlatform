import { ExpandAuditConstraintsForPasswordReset18000000000079 } from '../18000000000079-ExpandAuditConstraintsForPasswordReset';

describe('Migration 18000000000079 — password reset audit CHECK constraints', () => {
  it('up adds password_reset entity type and password_reset_* actions', async () => {
    const queries: string[] = [];
    const qr = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new ExpandAuditConstraintsForPasswordReset18000000000079();
    await migration.up(qr as any);

    const joined = queries.join('\n');
    expect(joined).toContain("'password_reset'");
    expect(joined).toContain("'password_reset_requested'");
    expect(joined).toContain("'password_reset_completed'");
    expect(
      queries.some((q) => q.includes('CHK_audit_events_entity_type')),
    ).toBe(true);
    expect(queries.some((q) => q.includes('CHK_audit_events_action'))).toBe(
      true,
    );
  });

  it('down omits password reset literals', async () => {
    const queries: string[] = [];
    const qr = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new ExpandAuditConstraintsForPasswordReset18000000000079();
    await migration.down(qr as any);

    const joined = queries.join('\n');
    expect(joined).not.toContain("'password_reset'");
    expect(joined).not.toContain('password_reset_requested');
    expect(joined).not.toContain('password_reset_completed');
  });
});
