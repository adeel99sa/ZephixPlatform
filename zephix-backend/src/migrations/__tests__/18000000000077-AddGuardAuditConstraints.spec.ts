import { AddGuardAuditConstraints18000000000077 } from '../18000000000077-AddGuardAuditConstraints';

describe('Migration 18000000000077 — guard audit CHECK constraints', () => {
  it('up references authorization_decision and guard audit actions', async () => {
    const queries: string[] = [];
    const qr = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AddGuardAuditConstraints18000000000077();
    await migration.up(qr as any);

    const joined = queries.join('\n');
    expect(joined).toContain('authorization_decision');
    expect(joined).toContain('guard_allow');
    expect(joined).toContain('guard_deny');
    expect(
      queries.some((q) => q.includes('CHK_audit_events_entity_type')),
    ).toBe(true);
    expect(queries.some((q) => q.includes('CHK_audit_events_action'))).toBe(
      true,
    );
  });

  it('down omits new guard audit literals', async () => {
    const queries: string[] = [];
    const qr = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AddGuardAuditConstraints18000000000077();
    await migration.down(qr as any);

    const joined = queries.join('\n');
    expect(joined).not.toContain('authorization_decision');
    expect(joined).not.toContain('guard_allow');
    expect(joined).not.toContain('guard_deny');
  });
});
