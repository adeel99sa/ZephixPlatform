import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

/**
 * Phase 4.2: Dashboard Studio Schema
 *
 * Creates:
 * - dashboards table
 * - dashboard_widgets table
 * - dashboard_templates table
 * - metric_definitions table
 * - Enums: dashboard_visibility, dashboard_persona, dashboard_methodology, metric_unit, metric_grain
 * - Indexes and foreign keys
 */
export class Phase4DashboardStudio1767550031000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE dashboard_visibility AS ENUM ('PRIVATE', 'WORKSPACE', 'ORG');
    `);
    await queryRunner.query(`
      CREATE TYPE dashboard_persona AS ENUM ('EXEC', 'PMO', 'PROGRAM_MANAGER', 'PROJECT_MANAGER', 'RESOURCE_MANAGER', 'DELIVERY_LEAD');
    `);
    await queryRunner.query(`
      CREATE TYPE dashboard_methodology AS ENUM ('AGILE', 'SCRUM', 'WATERFALL', 'HYBRID');
    `);
    await queryRunner.query(`
      CREATE TYPE metric_unit AS ENUM ('COUNT', 'PERCENT', 'HOURS', 'CURRENCY', 'DAYS');
    `);
    await queryRunner.query(`
      CREATE TYPE metric_grain AS ENUM ('ORG', 'WORKSPACE', 'PORTFOLIO', 'PROGRAM', 'PROJECT', 'RESOURCE', 'WEEK', 'DAY');
    `);

    // 1. Create dashboards table
    await queryRunner.createTable(
      new Table({
        name: 'dashboards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'owner_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'visibility',
            type: 'enum',
            enum: ['PRIVATE', 'WORKSPACE', 'ORG'],
            default: "'PRIVATE'",
          },
          {
            name: 'is_template_instance',
            type: 'boolean',
            default: false,
          },
          {
            name: 'template_key',
            type: 'varchar',
            length: '100',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Indexes for dashboards
    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'idx_dashboards_org',
        columnNames: ['organization_id'],
      }),
    );
    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'idx_dashboards_org_workspace',
        columnNames: ['organization_id', 'workspace_id'],
      }),
    );
    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'idx_dashboards_org_visibility',
        columnNames: ['organization_id', 'visibility'],
      }),
    );

    // Foreign keys for dashboards
    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['workspace_id'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'dashboards',
      new TableForeignKey({
        columnNames: ['owner_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 2. Create dashboard_widgets table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_widgets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dashboard_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'widget_key',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'layout',
            type: 'jsonb',
            isNullable: false,
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

    // Indexes for dashboard_widgets
    await queryRunner.createIndex(
      'dashboard_widgets',
      new TableIndex({
        name: 'idx_dashboard_widgets_dashboard',
        columnNames: ['dashboard_id'],
      }),
    );
    await queryRunner.createIndex(
      'dashboard_widgets',
      new TableIndex({
        name: 'idx_dashboard_widgets_org_dashboard',
        columnNames: ['organization_id', 'dashboard_id'],
      }),
    );
    await queryRunner.createIndex(
      'dashboard_widgets',
      new TableIndex({
        name: 'idx_dashboard_widgets_org_widget_key',
        columnNames: ['organization_id', 'widget_key'],
      }),
    );

    // Foreign keys for dashboard_widgets
    await queryRunner.createForeignKey(
      'dashboard_widgets',
      new TableForeignKey({
        columnNames: ['dashboard_id'],
        referencedTableName: 'dashboards',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'dashboard_widgets',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. Create dashboard_templates table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'key',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'persona',
            type: 'enum',
            enum: [
              'EXEC',
              'PMO',
              'PROGRAM_MANAGER',
              'PROJECT_MANAGER',
              'RESOURCE_MANAGER',
              'DELIVERY_LEAD',
            ],
            isNullable: false,
          },
          {
            name: 'methodology',
            type: 'enum',
            enum: ['AGILE', 'SCRUM', 'WATERFALL', 'HYBRID'],
            isNullable: true,
          },
          {
            name: 'definition',
            type: 'jsonb',
            isNullable: false,
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

    // Unique constraint for dashboard_templates
    await queryRunner.createUniqueConstraint(
      'dashboard_templates',
      new TableUnique({
        name: 'uq_dashboard_templates_org_key',
        columnNames: ['organization_id', 'key'],
      }),
    );

    // Foreign key for dashboard_templates
    await queryRunner.createForeignKey(
      'dashboard_templates',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 4. Create metric_definitions table
    await queryRunner.createTable(
      new Table({
        name: 'metric_definitions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'key',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'unit',
            type: 'enum',
            enum: ['COUNT', 'PERCENT', 'HOURS', 'CURRENCY', 'DAYS'],
            isNullable: false,
          },
          {
            name: 'grain',
            type: 'enum',
            enum: [
              'ORG',
              'WORKSPACE',
              'PORTFOLIO',
              'PROGRAM',
              'PROJECT',
              'RESOURCE',
              'WEEK',
              'DAY',
            ],
            isNullable: false,
          },
          {
            name: 'formula',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'default_filters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: false,
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

    // Unique constraint for metric_definitions
    await queryRunner.createUniqueConstraint(
      'metric_definitions',
      new TableUnique({
        name: 'uq_metric_definitions_org_key',
        columnNames: ['organization_id', 'key'],
      }),
    );

    // Indexes for metric_definitions
    await queryRunner.createIndex(
      'metric_definitions',
      new TableIndex({
        name: 'idx_metric_definitions_org_workspace',
        columnNames: ['organization_id', 'workspace_id'],
      }),
    );
    await queryRunner.createIndex(
      'metric_definitions',
      new TableIndex({
        name: 'idx_metric_definitions_org_key',
        columnNames: ['organization_id', 'key'],
      }),
    );

    // Foreign keys for metric_definitions
    await queryRunner.createForeignKey(
      'metric_definitions',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'metric_definitions',
      new TableForeignKey({
        columnNames: ['workspace_id'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'metric_definitions',
      new TableForeignKey({
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 5. Seed dashboard templates
    await this.seedTemplates(queryRunner);
  }

  private async seedTemplates(queryRunner: QueryRunner): Promise<void> {
    // Get first organization ID (for seeding)
    const orgResult = await queryRunner.query(
      `SELECT id FROM organizations LIMIT 1`,
    );
    if (orgResult.length === 0) {
      console.warn('No organizations found, skipping template seeding');
      return;
    }
    const orgId = orgResult[0].id;

    const templates = [
      {
        key: 'exec_overview',
        name: 'Executive Overview',
        persona: 'EXEC',
        methodology: null,
        definition: {
          visibility: 'ORG',
          widgets: [
            {
              widgetKey: 'portfolio_summary',
              title: 'Portfolio Summary',
              config: {},
              layout: { x: 0, y: 0, w: 6, h: 4 },
            },
            {
              widgetKey: 'program_summary',
              title: 'Program Summary',
              config: {},
              layout: { x: 6, y: 0, w: 6, h: 4 },
            },
            {
              widgetKey: 'risk_summary',
              title: 'Risk Summary',
              config: {},
              layout: { x: 0, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'budget_variance',
              title: 'Budget Variance',
              config: {},
              layout: { x: 4, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'resource_utilization',
              title: 'Resource Utilization',
              config: {},
              layout: { x: 8, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'conflict_trends',
              title: 'Conflict Trends',
              config: {},
              layout: { x: 0, y: 7, w: 6, h: 3 },
            },
            {
              widgetKey: 'project_health',
              title: 'Project Health',
              config: {},
              layout: { x: 6, y: 7, w: 6, h: 3 },
            },
          ],
        },
      },
      {
        key: 'pmo_delivery_health',
        name: 'PMO Delivery Health',
        persona: 'PMO',
        methodology: null,
        definition: {
          visibility: 'WORKSPACE',
          widgets: [
            {
              widgetKey: 'project_health',
              title: 'Project Health',
              config: {},
              layout: { x: 0, y: 0, w: 6, h: 4 },
            },
            {
              widgetKey: 'budget_variance',
              title: 'Budget Variance',
              config: {},
              layout: { x: 6, y: 0, w: 6, h: 4 },
            },
            {
              widgetKey: 'resource_utilization',
              title: 'Resource Utilization',
              config: {},
              layout: { x: 0, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'conflict_trends',
              title: 'Conflict Trends',
              config: {},
              layout: { x: 4, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'risk_summary',
              title: 'Risk Summary',
              config: {},
              layout: { x: 8, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'portfolio_summary',
              title: 'Portfolio Summary',
              config: {},
              layout: { x: 0, y: 7, w: 6, h: 3 },
            },
            {
              widgetKey: 'program_summary',
              title: 'Program Summary',
              config: {},
              layout: { x: 6, y: 7, w: 6, h: 3 },
            },
          ],
        },
      },
      {
        key: 'program_rollup',
        name: 'Program Rollup',
        persona: 'PROGRAM_MANAGER',
        methodology: null,
        definition: {
          visibility: 'WORKSPACE',
          widgets: [
            {
              widgetKey: 'program_summary',
              title: 'Program Summary',
              config: {},
              layout: { x: 0, y: 0, w: 8, h: 4 },
            },
            {
              widgetKey: 'project_health',
              title: 'Project Health',
              config: {},
              layout: { x: 8, y: 0, w: 4, h: 4 },
            },
            {
              widgetKey: 'resource_utilization',
              title: 'Resource Utilization',
              config: {},
              layout: { x: 0, y: 4, w: 6, h: 3 },
            },
            {
              widgetKey: 'conflict_trends',
              title: 'Conflict Trends',
              config: {},
              layout: { x: 6, y: 4, w: 6, h: 3 },
            },
            {
              widgetKey: 'risk_summary',
              title: 'Risk Summary',
              config: {},
              layout: { x: 0, y: 7, w: 4, h: 3 },
            },
            {
              widgetKey: 'budget_variance',
              title: 'Budget Variance',
              config: {},
              layout: { x: 4, y: 7, w: 4, h: 3 },
            },
            {
              widgetKey: 'sprint_metrics',
              title: 'Sprint Metrics',
              config: {},
              layout: { x: 8, y: 7, w: 4, h: 3 },
            },
          ],
        },
      },
      {
        key: 'pm_agile_sprint',
        name: 'PM Agile Sprint',
        persona: 'PROJECT_MANAGER',
        methodology: 'AGILE',
        definition: {
          visibility: 'WORKSPACE',
          widgets: [
            {
              widgetKey: 'sprint_metrics',
              title: 'Sprint Metrics',
              config: {},
              layout: { x: 0, y: 0, w: 6, h: 4 },
            },
            {
              widgetKey: 'project_health',
              title: 'Project Health',
              config: {},
              layout: { x: 6, y: 0, w: 6, h: 4 },
            },
            {
              widgetKey: 'resource_utilization',
              title: 'Resource Utilization',
              config: {},
              layout: { x: 0, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'conflict_trends',
              title: 'Conflict Trends',
              config: {},
              layout: { x: 4, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'risk_summary',
              title: 'Risk Summary',
              config: {},
              layout: { x: 8, y: 4, w: 4, h: 3 },
            },
            {
              widgetKey: 'budget_variance',
              title: 'Budget Variance',
              config: {},
              layout: { x: 0, y: 7, w: 6, h: 3 },
            },
            {
              widgetKey: 'sprint_metrics',
              title: 'Sprint Velocity',
              config: {},
              layout: { x: 6, y: 7, w: 6, h: 3 },
            },
          ],
        },
      },
      {
        key: 'resource_utilization_conflicts',
        name: 'Resource Utilization & Conflicts',
        persona: 'RESOURCE_MANAGER',
        methodology: null,
        definition: {
          visibility: 'WORKSPACE',
          widgets: [
            {
              widgetKey: 'resource_utilization',
              title: 'Resource Utilization',
              config: {},
              layout: { x: 0, y: 0, w: 8, h: 5 },
            },
            {
              widgetKey: 'conflict_trends',
              title: 'Conflict Trends',
              config: {},
              layout: { x: 8, y: 0, w: 4, h: 5 },
            },
            {
              widgetKey: 'project_health',
              title: 'Project Health',
              config: {},
              layout: { x: 0, y: 5, w: 6, h: 3 },
            },
            {
              widgetKey: 'risk_summary',
              title: 'Risk Summary',
              config: {},
              layout: { x: 6, y: 5, w: 6, h: 3 },
            },
            {
              widgetKey: 'budget_variance',
              title: 'Budget Variance',
              config: {},
              layout: { x: 0, y: 8, w: 4, h: 3 },
            },
            {
              widgetKey: 'portfolio_summary',
              title: 'Portfolio Summary',
              config: {},
              layout: { x: 4, y: 8, w: 4, h: 3 },
            },
            {
              widgetKey: 'program_summary',
              title: 'Program Summary',
              config: {},
              layout: { x: 8, y: 8, w: 4, h: 3 },
            },
          ],
        },
      },
    ];

    for (const template of templates) {
      await queryRunner.query(
        `INSERT INTO dashboard_templates (organization_id, key, name, persona, methodology, definition, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (organization_id, key) DO UPDATE SET
           name = EXCLUDED.name,
           persona = EXCLUDED.persona,
           methodology = EXCLUDED.methodology,
           definition = EXCLUDED.definition,
           updated_at = CURRENT_TIMESTAMP`,
        [
          orgId,
          template.key,
          template.name,
          template.persona,
          template.methodology,
          JSON.stringify(template.definition),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const metricDefinitionsTable = await queryRunner.getTable(
      'metric_definitions',
    );
    if (metricDefinitionsTable) {
      const foreignKeys = metricDefinitionsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('metric_definitions', fk);
      }
    }

    const dashboardTemplatesTable = await queryRunner.getTable(
      'dashboard_templates',
    );
    if (dashboardTemplatesTable) {
      const foreignKeys = dashboardTemplatesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_templates', fk);
      }
    }

    const dashboardWidgetsTable = await queryRunner.getTable(
      'dashboard_widgets',
    );
    if (dashboardWidgetsTable) {
      const foreignKeys = dashboardWidgetsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_widgets', fk);
      }
    }

    const dashboardsTable = await queryRunner.getTable('dashboards');
    if (dashboardsTable) {
      const foreignKeys = dashboardsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('dashboards', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('metric_definitions', true);
    await queryRunner.dropTable('dashboard_templates', true);
    await queryRunner.dropTable('dashboard_widgets', true);
    await queryRunner.dropTable('dashboards', true);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS metric_grain`);
    await queryRunner.query(`DROP TYPE IF EXISTS metric_unit`);
    await queryRunner.query(`DROP TYPE IF EXISTS dashboard_methodology`);
    await queryRunner.query(`DROP TYPE IF EXISTS dashboard_persona`);
    await queryRunner.query(`DROP TYPE IF EXISTS dashboard_visibility`);
  }
}

