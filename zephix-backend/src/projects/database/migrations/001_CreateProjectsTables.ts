import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Create Projects Tables Migration
 *
 * Creates all necessary tables for the projects module including:
 * - projects: Main project table
 * - teams: Team management table
 * - team_members: Team membership table
 * - roles: Role definitions table
 *
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class CreateProjectsTables1704067200000 implements MigrationInterface {
  name = 'CreateProjectsTables1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'enum',
            enum: [
              'admin',
              'editor',
              'viewer',
              'project_manager',
              'developer',
              'analyst',
            ],
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'json',
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

    // Create projects table
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
            default: "'planning'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'medium'",
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'budget',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'business_requirements_document',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
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

    // Create teams table
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isUnique: true,
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

    // Create team_members table
    await queryRunner.createTable(
      new Table({
        name: 'team_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'team_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'role_id',
            type: 'uuid',
          },
          {
            name: 'joined_at',
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

    // Create indexes using proper TableIndex objects
    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'IDX_PROJECT_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'IDX_PROJECT_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'team_members',
      new TableIndex({
        name: 'IDX_TEAM_MEMBER_UNIQUE',
        columnNames: ['team_id', 'user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_ROLE_NAME',
        columnNames: ['name'],
      }),
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        columnNames: ['team_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'team_members',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'RESTRICT',
      }),
    );

    // Insert default roles
    await queryRunner.query(`
      INSERT INTO roles (name, description, permissions) VALUES
      ('admin', 'Administrator with full access', '["read", "write", "delete", "manage_team"]'),
      ('editor', 'Editor with read and write access', '["read", "write"]'),
      ('viewer', 'Viewer with read-only access', '["read"]'),
      ('project_manager', 'Project manager with planning and coordination access', '["read", "write", "manage_tasks"]'),
      ('developer', 'Developer with technical implementation access', '["read", "write", "technical"]'),
      ('analyst', 'Analyst with data and requirements access', '["read", "write", "analyze"]')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys with proper null checking
    const teamMembersTable = await queryRunner.getTable('team_members');
    if (teamMembersTable && teamMembersTable.foreignKeys) {
      await queryRunner.dropForeignKeys(
        'team_members',
        teamMembersTable.foreignKeys,
      );
    }

    const teamsTable = await queryRunner.getTable('teams');
    if (teamsTable && teamsTable.foreignKeys) {
      await queryRunner.dropForeignKeys('teams', teamsTable.foreignKeys);
    }

    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable && projectsTable.foreignKeys) {
      await queryRunner.dropForeignKeys('projects', projectsTable.foreignKeys);
    }

    // Drop tables
    await queryRunner.dropTable('team_members');
    await queryRunner.dropTable('teams');
    await queryRunner.dropTable('projects');
    await queryRunner.dropTable('roles');
  }
}
