import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Creates the `custom_fields` table to match the CustomField entity
 * (src/modules/custom-fields/entities/custom-field.entity.ts).
 *
 * The existing migration 1794000000001 created `custom_field_definitions`
 * and `custom_field_values` (a different schema), but never created the
 * `custom_fields` table that the CustomField entity targets.
 *
 * Note: This table is short-lived per AD-024 greenfield rebuild path.
 * Creating it now to unblock tests; will be removed by AD-024 implementation.
 */
export class CreateCustomFieldsTable1800000000081
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'custom_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'is_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'default_value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'options',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'placeholder',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'help_text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'scope',
            type: 'varchar',
            length: '50',
            default: "'all'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'custom_fields',
      new TableIndex({
        name: 'IDX_custom_fields_org_name_unique',
        columnNames: ['organization_id', 'name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('custom_fields', true);
  }
}
