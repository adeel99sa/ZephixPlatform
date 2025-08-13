import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateDashboardSystem1710000000000 implements MigrationInterface {
  name = 'CreateDashboardSystem1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dashboard_templates table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'enum',
            enum: [
              'project_management',
              'business_intelligence',
              'operations',
              'finance',
              'hr',
              'marketing',
              'sales',
              'customer_support',
              'it',
              'general',
            ],
            default: "'general'",
          },
          {
            name: 'template_type',
            type: 'enum',
            enum: ['blank', 'prebuilt', 'custom', 'industry_specific'],
            default: "'prebuilt'",
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'preview_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
            default: "'1.0.0'",
          },
          {
            name: 'usage_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'review_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'last_modified_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create dashboards table
    await queryRunner.createTable(
      new Table({
        name: 'dashboards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['personal', 'team', 'organization', 'template'],
            default: "'personal'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'draft', 'archived'],
            default: "'draft'",
          },
          {
            name: 'layout',
            type: 'enum',
            enum: ['grid', 'flexible', 'custom'],
            default: "'grid'",
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'is_featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'theme',
            type: 'varchar',
            length: '50',
            default: "'default'",
          },
          {
            name: 'refresh_interval',
            type: 'integer',
            default: 300,
          },
          {
            name: 'last_refreshed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'view_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'last_modified_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create dashboard_widgets table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_widgets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'widget_type',
            type: 'enum',
            enum: [
              'project_grid',
              'project_timeline',
              'project_cards',
              'project_list',
              'project_kanban',
              'kpi_metric',
              'line_chart',
              'bar_chart',
              'pie_chart',
              'area_chart',
              'table',
              'heatmap',
              'scatter_plot',
              'ai_insights',
              'ai_predictions',
              'ai_alerts',
              'ai_recommendations',
              'alerts',
              'approvals',
              'tasks',
              'notifications',
              'custom_html',
              'embedded_content',
              'iframe',
            ],
            isNullable: false,
          },
          {
            name: 'size',
            type: 'enum',
            enum: [
              'small',
              'medium',
              'large',
              'xlarge',
              'full_width',
              'custom',
            ],
            default: "'medium'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'loading', 'error', 'disabled'],
            default: "'active'",
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'data_source',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'styling',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'layout',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_collapsible',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_collapsed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_resizable',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_draggable',
            type: 'boolean',
            default: true,
          },
          {
            name: 'refresh_interval',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_refreshed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'filters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'dashboard_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create dashboard_permissions table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'dashboard_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['view', 'edit', 'admin', 'owner'],
            default: "'view'",
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['user', 'role', 'team', 'organization'],
            default: "'user'",
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'team_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'granted_by_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'granted_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'dashboard_templates',
      new TableIndex({
        name: 'IDX_DASHBOARD_TEMPLATES_ORG_CATEGORY',
        columnNames: ['organization_id', 'category'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_templates',
      new TableIndex({
        name: 'IDX_DASHBOARD_TEMPLATES_TYPE_PUBLIC',
        columnNames: ['template_type', 'is_public'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_templates',
      new TableIndex({
        name: 'IDX_DASHBOARD_TEMPLATES_CREATED_BY_STATUS',
        columnNames: ['created_by_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'IDX_DASHBOARDS_ORG_STATUS',
        columnNames: ['organization_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'IDX_DASHBOARDS_CREATED_BY_TYPE',
        columnNames: ['created_by_id', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'IDX_DASHBOARDS_SLUG_ORG_UNIQUE',
        columnNames: ['slug', 'organization_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'dashboard_widgets',
      new TableIndex({
        name: 'IDX_DASHBOARD_WIDGETS_DASHBOARD_ORDER',
        columnNames: ['dashboard_id', 'order'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_widgets',
      new TableIndex({
        name: 'IDX_DASHBOARD_WIDGETS_TYPE_STATUS',
        columnNames: ['widget_type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_permissions',
      new TableIndex({
        name: 'IDX_DASHBOARD_PERMISSIONS_DASHBOARD_USER',
        columnNames: ['dashboard_id', 'user_id'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_permissions',
      new TableIndex({
        name: 'IDX_DASHBOARD_PERMISSIONS_DASHBOARD_ROLE',
        columnNames: ['dashboard_id', 'role'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_permissions',
      new TableIndex({
        name: 'IDX_DASHBOARD_PERMISSIONS_DASHBOARD_TEAM',
        columnNames: ['dashboard_id', 'team_id'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_permissions',
      new TableIndex({
        name: 'IDX_DASHBOARD_PERMISSIONS_DASHBOARD_ORG',
        columnNames: ['dashboard_id', 'organization_id'],
      }),
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'dashboard_templates',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_templates',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_templates',
      new TableForeignKey({
        columnNames: ['last_modified_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['last_modified_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_widgets',
      new TableForeignKey({
        columnNames: ['dashboard_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dashboards',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_permissions',
      new TableForeignKey({
        columnNames: ['dashboard_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dashboards',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_permissions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_permissions',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_permissions',
      new TableForeignKey({
        columnNames: ['granted_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const dashboardPermissionsTable = await queryRunner.getTable(
      'dashboard_permissions',
    );
    const dashboardWidgetsTable =
      await queryRunner.getTable('dashboard_widgets');
    const dashboardsTable = await queryRunner.getTable('dashboards');
    const dashboardTemplatesTable = await queryRunner.getTable(
      'dashboard_templates',
    );

    if (dashboardPermissionsTable) {
      const foreignKeys = dashboardPermissionsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_permissions', foreignKey);
      }
    }

    if (dashboardWidgetsTable) {
      const foreignKeys = dashboardWidgetsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_widgets', foreignKey);
      }
    }

    if (dashboardsTable) {
      const foreignKeys = dashboardsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('dashboards', foreignKey);
      }
    }

    if (dashboardTemplatesTable) {
      const foreignKeys = dashboardTemplatesTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_templates', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('dashboard_permissions');
    await queryRunner.dropTable('dashboard_widgets');
    await queryRunner.dropTable('dashboards');
    await queryRunner.dropTable('dashboard_templates');
  }
}
