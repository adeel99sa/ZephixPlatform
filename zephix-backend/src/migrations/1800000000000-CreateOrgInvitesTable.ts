import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

export class CreateOrgInvitesTable1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('org_invites');
    let table = tableExists ? await queryRunner.getTable('org_invites') : null;

    // Create table if it doesn't exist
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'org_invites',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'organization_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'role',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'token_hash',
              type: 'varchar',
              length: '64',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'invited_by_user_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'expires_at',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'accepted_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'revoked_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );
      table = await queryRunner.getTable('org_invites');
    } else {
      // Table exists - add missing columns if any
      const existingColumns = table!.columns.map((col) => col.name);
      const requiredColumns = [
        'id',
        'organization_id',
        'email',
        'role',
        'token_hash',
        'invited_by_user_id',
        'expires_at',
        'accepted_at',
        'revoked_at',
        'created_at',
        'updated_at',
      ];

      for (const colName of requiredColumns) {
        if (!existingColumns.includes(colName)) {
          let columnDef: TableColumn;
          switch (colName) {
            case 'id':
              columnDef = new TableColumn({
                name: 'id',
                type: 'uuid',
                isPrimary: true,
                default: 'uuid_generate_v4()',
              });
              break;
            case 'organization_id':
              columnDef = new TableColumn({
                name: 'organization_id',
                type: 'uuid',
                isNullable: false,
              });
              break;
            case 'email':
              columnDef = new TableColumn({
                name: 'email',
                type: 'varchar',
                length: '255',
                isNullable: false,
              });
              break;
            case 'role':
              columnDef = new TableColumn({
                name: 'role',
                type: 'varchar',
                length: '50',
                isNullable: false,
              });
              break;
            case 'token_hash':
              columnDef = new TableColumn({
                name: 'token_hash',
                type: 'varchar',
                length: '64',
                isNullable: false,
                isUnique: true,
              });
              break;
            case 'invited_by_user_id':
              columnDef = new TableColumn({
                name: 'invited_by_user_id',
                type: 'uuid',
                isNullable: true,
              });
              break;
            case 'expires_at':
              columnDef = new TableColumn({
                name: 'expires_at',
                type: 'timestamp',
                isNullable: false,
              });
              break;
            case 'accepted_at':
              columnDef = new TableColumn({
                name: 'accepted_at',
                type: 'timestamp',
                isNullable: true,
              });
              break;
            case 'revoked_at':
              columnDef = new TableColumn({
                name: 'revoked_at',
                type: 'timestamp',
                isNullable: true,
              });
              break;
            case 'created_at':
              columnDef = new TableColumn({
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
              });
              break;
            case 'updated_at':
              columnDef = new TableColumn({
                name: 'updated_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
              });
              break;
            default:
              continue;
          }
          await queryRunner.addColumn('org_invites', columnDef);
        }
      }
      // Refresh table after adding columns
      table = await queryRunner.getTable('org_invites');
    }

    // Add foreign keys only if they don't exist
    const existingForeignKeys = table!.foreignKeys || [];
    const hasOrgFk = existingForeignKeys.some(
      (fk) =>
        fk.columnNames.includes('organization_id') &&
        fk.referencedTableName === 'organizations',
    );
    if (!hasOrgFk) {
      await queryRunner.createForeignKey(
        'org_invites',
        new TableForeignKey({
          columnNames: ['organization_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'organizations',
          onDelete: 'CASCADE',
        }),
      );
    }

    const hasUserFk = existingForeignKeys.some(
      (fk) =>
        fk.columnNames.includes('invited_by_user_id') &&
        fk.referencedTableName === 'users',
    );
    if (!hasUserFk) {
      await queryRunner.createForeignKey(
        'org_invites',
        new TableForeignKey({
          columnNames: ['invited_by_user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }),
      );
    }

    // Add indexes only if they don't exist
    const existingIndices = table!.indices || [];
    const indexNames = existingIndices.map((idx) => idx.name);

    if (!indexNames.includes('idx_org_invites_org_email')) {
      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'idx_org_invites_org_email',
          columnNames: ['organization_id', 'email'],
        }),
      );
    }

    if (!indexNames.includes('idx_org_invites_token_hash')) {
      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'idx_org_invites_token_hash',
          columnNames: ['token_hash'],
        }),
      );
    }

    if (!indexNames.includes('idx_org_invites_org_created')) {
      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'idx_org_invites_org_created',
          columnNames: ['organization_id', 'created_at'],
        }),
      );
    }

    if (!indexNames.includes('ux_org_invites_token_hash')) {
      await queryRunner.createIndex(
        'org_invites',
        new TableIndex({
          name: 'ux_org_invites_token_hash',
          columnNames: ['token_hash'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    const table = await queryRunner.getTable('org_invites');
    if (table) {
      const indices = table.indices || [];
      for (const index of indices) {
        if (['ux_org_invites_token_hash', 'idx_org_invites_org_created', 'idx_org_invites_token_hash', 'idx_org_invites_org_email'].includes(index.name)) {
          await queryRunner.dropIndex('org_invites', index);
        }
      }

      // Drop foreign keys
      const foreignKeys = table.foreignKeys || [];
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('org_invites', fk);
      }
    }

    // Drop table
    await queryRunner.dropTable('org_invites');
  }
}
