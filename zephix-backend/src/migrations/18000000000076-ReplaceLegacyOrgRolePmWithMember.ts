import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AD-011 alignment: remove persisted org-level role `pm` in favor of `member`
 * (same PlatformRole.MEMBER semantics as before).
 *
 * - Migrates `user_organizations.role` rows from `pm` → `member`.
 * - When `invitations` exists, migrates `invitations.role` the same way (invite store,
 *   not `users.role`; avoids breaking reads after entity/DTO enum removes `pm`).
 *
 * Handles varchar columns (bootstrap schema) and PostgreSQL enums (`*_role_enum`).
 *
 * Down is intentionally a no-op: PostgreSQL cannot safely restore removed enum labels,
 * and reverting data from `member` back to `pm` would contradict AD-011.
 */
export class ReplaceLegacyOrgRolePmWithMember18000000000076
  implements MigrationInterface
{
  name = 'ReplaceLegacyOrgRolePmWithMember18000000000076';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.migrateRoleColumn(queryRunner, 'user_organizations', 'role');
    const invitationsExists = await queryRunner.hasTable('invitations');
    if (invitationsExists) {
      await this.migrateRoleColumn(queryRunner, 'invitations', 'role');
    }

    const orgInvitesExists = await queryRunner.hasTable('org_invites');
    if (orgInvitesExists) {
      await queryRunner.query(
        `UPDATE org_invites SET role = 'member' WHERE role = 'pm'`,
      );
    }
  }

  /**
   * Normalize quoted PostgreSQL identifiers for dynamic SQL.
   */
  private quoteIdent(ident: string): string {
    return `"${ident.replace(/"/g, '""')}"`;
  }

  private async migrateRoleColumn(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    const tableExists = await queryRunner.hasTable(tableName);
    if (!tableExists) {
      return;
    }

    const meta = await queryRunner.query(
      `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      `,
      [tableName, columnName],
    );

    if (!meta?.length) {
      return;
    }

    const { data_type: dataType, udt_name: udtName } = meta[0];

    const qTable = this.quoteIdent(tableName);
    const qCol = this.quoteIdent(columnName);

    if (dataType === 'USER-DEFINED' && udtName) {
      await queryRunner.query(
        `ALTER TYPE "${udtName}" ADD VALUE IF NOT EXISTS 'member'`,
      );
      await queryRunner.query(
        `UPDATE ${qTable} SET ${qCol} = 'member'::"${udtName}" WHERE ${qCol}::text = 'pm'`,
      );
      return;
    }

    await queryRunner.query(
      `UPDATE ${qTable} SET ${qCol} = 'member' WHERE ${qCol} = 'pm'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible: cannot drop enum label `pm` or safely revert member → pm without
    // violating AD-011. Fresh installs created after `up` never stored `pm`.
  }
}
