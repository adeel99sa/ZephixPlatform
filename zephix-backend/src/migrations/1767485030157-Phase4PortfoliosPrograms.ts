import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Phase 4.1: Portfolio and Program Schema
 *
 * Creates:
 * - portfolios table (org-level)
 * - programs table (org-level, belongs to portfolio)
 * - portfolio_projects join table
 * - Adds program_id to projects (nullable initially)
 * - Foreign keys and indexes for rollups
 */
export class Phase4PortfoliosPrograms1767485030157
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 2.1: Create portfolios table
    const portfoliosTableExists = await queryRunner.hasTable('portfolios');
    if (!portfoliosTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'portfolios',
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
              name: 'status',
              type: 'varchar',
              length: '50',
              default: "'active'",
            },
            {
              name: 'created_by_id',
              type: 'uuid',
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

      // Foreign key: portfolios.organization_id -> organizations.id
      await queryRunner.createForeignKey(
        'portfolios',
        new TableForeignKey({
          columnNames: ['organization_id'],
          referencedTableName: 'organizations',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Foreign key: portfolios.created_by_id -> users.id
      await queryRunner.createForeignKey(
        'portfolios',
        new TableForeignKey({
          columnNames: ['created_by_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      // Indexes for rollups
      await queryRunner.createIndex(
        'portfolios',
        new TableIndex({
          name: 'idx_portfolio_org',
          columnNames: ['organization_id'],
        }),
      );

      // Unique constraint: (organization_id, name)
      await queryRunner.createIndex(
        'portfolios',
        new TableIndex({
          name: 'idx_portfolio_org_name',
          columnNames: ['organization_id', 'name'],
          isUnique: true,
        }),
      );
    }

    // 2.2: Create programs table
    const programsTableExists = await queryRunner.hasTable('programs');
    if (!programsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'programs',
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
              name: 'portfolio_id',
              type: 'uuid',
              isNullable: false,
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
              name: 'status',
              type: 'varchar',
              length: '50',
              default: "'active'",
            },
            {
              name: 'created_by_id',
              type: 'uuid',
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

      // Foreign keys
      await queryRunner.createForeignKey(
        'programs',
        new TableForeignKey({
          columnNames: ['organization_id'],
          referencedTableName: 'organizations',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'programs',
        new TableForeignKey({
          columnNames: ['portfolio_id'],
          referencedTableName: 'portfolios',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'programs',
        new TableForeignKey({
          columnNames: ['created_by_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      // Indexes for rollups
      await queryRunner.createIndex(
        'programs',
        new TableIndex({
          name: 'idx_program_org',
          columnNames: ['organization_id'],
        }),
      );

      await queryRunner.createIndex(
        'programs',
        new TableIndex({
          name: 'idx_program_org_portfolio',
          columnNames: ['organization_id', 'portfolio_id'],
        }),
      );

      // Unique constraint: (organization_id, portfolio_id, name)
      await queryRunner.createIndex(
        'programs',
        new TableIndex({
          name: 'idx_program_org_portfolio_name',
          columnNames: ['organization_id', 'portfolio_id', 'name'],
          isUnique: true,
        }),
      );
    }

    // 2.3: Create portfolio_projects join table
    const portfolioProjectsTableExists = await queryRunner.hasTable(
      'portfolio_projects',
    );
    if (!portfolioProjectsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'portfolio_projects',
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
              name: 'portfolio_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'project_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Foreign keys
      await queryRunner.createForeignKey(
        'portfolio_projects',
        new TableForeignKey({
          columnNames: ['portfolio_id'],
          referencedTableName: 'portfolios',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'portfolio_projects',
        new TableForeignKey({
          columnNames: ['project_id'],
          referencedTableName: 'projects',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Unique constraint: (portfolio_id, project_id)
      await queryRunner.createIndex(
        'portfolio_projects',
        new TableIndex({
          name: 'idx_portfolio_project_unique',
          columnNames: ['portfolio_id', 'project_id'],
          isUnique: true,
        }),
      );

      // Indexes for rollups
      await queryRunner.createIndex(
        'portfolio_projects',
        new TableIndex({
          name: 'idx_portfolio_project_org',
          columnNames: ['organization_id'],
        }),
      );

      await queryRunner.createIndex(
        'portfolio_projects',
        new TableIndex({
          name: 'idx_portfolio_project_org_portfolio',
          columnNames: ['organization_id', 'portfolio_id'],
        }),
      );

      await queryRunner.createIndex(
        'portfolio_projects',
        new TableIndex({
          name: 'idx_portfolio_project_org_project',
          columnNames: ['organization_id', 'project_id'],
        }),
      );
    }

    // 2.3: Alter projects table - add program_id if not exists
    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable) {
      const programIdColumn = projectsTable.findColumnByName('program_id');
      if (!programIdColumn) {
        await queryRunner.addColumn(
          'projects',
          new TableColumn({
            name: 'program_id',
            type: 'uuid',
            isNullable: true,
          }),
        );

        // Foreign key: projects.program_id -> programs.id
        await queryRunner.createForeignKey(
          'projects',
          new TableForeignKey({
            columnNames: ['program_id'],
            referencedTableName: 'programs',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }

      // 2.4: Add index on (organization_id, workspace_id, program_id)
      const existingIndex = projectsTable.indices.find(
        (idx) => idx.name === 'idx_project_org_workspace_program',
      );
      if (!existingIndex) {
        await queryRunner.createIndex(
          'projects',
          new TableIndex({
            name: 'idx_project_org_workspace_program',
            columnNames: ['organization_id', 'workspace_id', 'program_id'],
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable) {
      // Drop foreign key first
      const programForeignKey = projectsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('program_id') !== -1,
      );
      if (programForeignKey) {
        await queryRunner.dropForeignKey('projects', programForeignKey);
      }

      // Drop index
      const programIndex = projectsTable.indices.find(
        (idx) => idx.name === 'idx_project_org_workspace_program',
      );
      if (programIndex) {
        await queryRunner.dropIndex('projects', programIndex);
      }

      // Drop column
      const programIdColumn = projectsTable.findColumnByName('program_id');
      if (programIdColumn) {
        await queryRunner.dropColumn('projects', 'program_id');
      }
    }

    // Drop portfolio_projects table
    if (await queryRunner.hasTable('portfolio_projects')) {
      await queryRunner.dropTable('portfolio_projects');
    }

    // Drop programs table
    if (await queryRunner.hasTable('programs')) {
      await queryRunner.dropTable('programs');
    }

    // Drop portfolios table
    if (await queryRunner.hasTable('portfolios')) {
      await queryRunner.dropTable('portfolios');
    }
  }
}
