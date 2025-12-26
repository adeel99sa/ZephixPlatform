import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWorkspaceModuleConfigs1769000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table
    await queryRunner.createTable(
      new Table({
        name: 'workspace_module_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'module_key',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'integer',
            default: 1,
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
        foreignKeys: [
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new TableIndex({
            name: 'UQ_workspace_module_config',
            columnNames: ['workspace_id', 'module_key'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_workspace_module_config_workspace',
            columnNames: ['workspace_id'],
          }),
        ],
      }),
    );

    // Seed default modules using TypeScript loop (safer than SQL unnest)
    // Query all workspaces (don't filter by deleted_at - seed defaults for all workspaces)
    // This avoids column name drift issues between deleted_at and soft_deleted_at
    const workspaces = await queryRunner.query(`
      SELECT id FROM workspaces
    `);

    const moduleDefaults = [
      {
        key: 'resource_intelligence',
        enabled: true,
        config: JSON.stringify({ hardCap: 110 }),
      },
      {
        key: 'risk_sentinel',
        enabled: true,
        config: JSON.stringify({ sensitivity: 'high' }),
      },
      {
        key: 'portfolio_rollups',
        enabled: false,
        config: null,
      },
      {
        key: 'ai_assistant',
        enabled: false,
        config: null,
      },
      {
        key: 'document_processing',
        enabled: false,
        config: null,
      },
    ];

    // Insert for each workspace
    for (const workspace of workspaces) {
      for (const module of moduleDefaults) {
        await queryRunner.query(
          `
          INSERT INTO workspace_module_configs (workspace_id, module_key, enabled, config, version)
          VALUES ($1, $2, $3, $4::jsonb, 1)
          ON CONFLICT (workspace_id, module_key) DO NOTHING
        `,
          [workspace.id, module.key, module.enabled, module.config],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('workspace_module_configs', true);
  }
}
