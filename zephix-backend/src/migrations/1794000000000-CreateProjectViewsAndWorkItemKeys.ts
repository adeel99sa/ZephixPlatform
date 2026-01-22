import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateProjectViewsAndWorkItemKeys1794000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create project_views table
    await queryRunner.createTable(
      new Table({
        name: 'project_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'config',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'project_views',
      new TableIndex({
        name: 'IDX_project_views_project_type',
        columnNames: ['projectId', 'type'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'project_views',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
      }),
    );

    // 2. Create work_item_sequences table
    await queryRunner.createTable(
      new Table({
        name: 'work_item_sequences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'workspaceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'nextNumber',
            type: 'int',
            default: 0,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'work_item_sequences',
      new TableIndex({
        name: 'IDX_work_item_sequences_workspace',
        columnNames: ['workspaceId'],
        isUnique: true,
      }),
    );

    // 3. Add key column to work_items if it doesn't exist
    const workItemsTable = await queryRunner.getTable('work_items');
    const hasKeyColumn = workItemsTable?.findColumnByName('key');

    if (!hasKeyColumn) {
      await queryRunner.query(`
        ALTER TABLE "work_items"
        ADD COLUMN "key" varchar(32)
      `);

      await queryRunner.createIndex(
        'work_items',
        new TableIndex({
          name: 'IDX_work_items_workspace_key',
          columnNames: ['workspace_id', 'key'],
          isUnique: true,
          where: 'deleted_at IS NULL',
        }),
      );
    }

    // 4. Add slug, projectType, isActive to projects if they don't exist
    const projectsTable = await queryRunner.getTable('projects');
    const hasSlug = projectsTable?.findColumnByName('slug');
    const hasProjectType = projectsTable?.findColumnByName('projectType');
    const hasIsActive = projectsTable?.findColumnByName('isActive');

    if (!hasSlug) {
      await queryRunner.query(`
        ALTER TABLE "projects"
        ADD COLUMN "slug" varchar(140)
      `);
    }

    if (!hasProjectType) {
      await queryRunner.query(`
        ALTER TABLE "projects"
        ADD COLUMN "projectType" varchar(40) DEFAULT 'delivery'
      `);
    }

    if (!hasIsActive) {
      await queryRunner.query(`
        ALTER TABLE "projects"
        ADD COLUMN "isActive" boolean DEFAULT true
      `);
    }

    // 5. Create unique index on projects (workspaceId, slug) if it doesn't exist
    const existingIndexes = await queryRunner.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'projects' 
      AND indexname = 'IDX_projects_workspace_slug'
    `);

    if (existingIndexes.length === 0) {
      await queryRunner.createIndex(
        'projects',
        new TableIndex({
          name: 'IDX_projects_workspace_slug',
          columnNames: ['workspace_id', 'slug'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_views', true);
    await queryRunner.dropTable('work_item_sequences', true);

    const workItemsTable = await queryRunner.getTable('work_items');
    const hasKeyColumn = workItemsTable?.findColumnByName('key');
    if (hasKeyColumn) {
      await queryRunner.query(`ALTER TABLE "work_items" DROP COLUMN "key"`);
    }

    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable?.findColumnByName('slug')) {
      await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "slug"`);
    }
    if (projectsTable?.findColumnByName('projectType')) {
      await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "projectType"`);
    }
    if (projectsTable?.findColumnByName('isActive')) {
      await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "isActive"`);
    }
  }
}
