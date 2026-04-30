import { ReplaceLegacyOrgRolePmWithMember18000000000076 } from '../18000000000076-ReplaceLegacyOrgRolePmWithMember';

describe('Migration 18000000000076 — replace legacy org role pm with member', () => {
  it('adds member label and updates user_organizations when role is a postgres enum', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      hasTable: jest.fn(async (name: string) =>
        name === 'user_organizations' ? true : false,
      ),
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('information_schema.columns')) {
          return [
            {
              data_type: 'USER-DEFINED',
              udt_name: 'user_organizations_role_enum',
            },
          ];
        }
        return [];
      }),
    };

    const migration = new ReplaceLegacyOrgRolePmWithMember18000000000076();
    await migration.up(mockQueryRunner as any);

    expect(
      queries.some((q) =>
        q.includes(
          `ALTER TYPE "user_organizations_role_enum" ADD VALUE IF NOT EXISTS 'member'`,
        ),
      ),
    ).toBe(true);
    expect(
      queries.some((q) =>
        q.includes(
          `UPDATE "user_organizations" SET "role" = 'member'::"user_organizations_role_enum" WHERE "role"::text = 'pm'`,
        ),
      ),
    ).toBe(true);
    expect(queries.some((q) => q.includes('UPDATE org_invites'))).toBe(false);
  });

  it('runs varchar update for user_organizations and updates org_invites when present', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      hasTable: jest.fn(async (name: string) =>
        ['user_organizations', 'org_invites'].includes(name),
      ),
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('information_schema.columns')) {
          return [{ data_type: 'character varying', udt_name: 'varchar' }];
        }
        return [];
      }),
    };

    const migration = new ReplaceLegacyOrgRolePmWithMember18000000000076();
    await migration.up(mockQueryRunner as any);

    expect(
      queries.some(
        (q) =>
          q.includes('UPDATE') &&
          q.includes('user_organizations') &&
          q.includes(`= 'member' WHERE`),
      ),
    ).toBe(true);
    expect(
      queries.some((q) =>
        q.includes(`UPDATE org_invites SET role = 'member' WHERE role = 'pm'`),
      ),
    ).toBe(true);
  });
});
