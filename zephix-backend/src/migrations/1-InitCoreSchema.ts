import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Bootstrap Migration: InitCoreSchema
 *
 * This migration creates the minimal core tables required before other migrations run.
 * It must run first (lowest timestamp) to bootstrap a fresh database.
 *
 * Creates:
 * - pgcrypto extension (for UUID generation)
 * - organizations table
 * - users table
 * - user_organizations table
 * - workspaces table
 * - projects table (minimal schema, will be extended by later migrations)
 *
 * Uses IF NOT EXISTS guards to be safe if tables already exist.
 */
export class InitCoreSchema1 implements MigrationInterface {
  name = 'InitCoreSchema1';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create UUID extension for UUID generation
    // PostgreSQL 13+ has gen_random_uuid() built-in, but we try to enable extensions for older versions
    // Try pgcrypto first (provides gen_random_uuid()), fallback to uuid-ossp if Railway doesn't allow pgcrypto
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    } catch (error) {
      // Railway may not allow pgcrypto, try uuid-ossp instead
      try {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      } catch (e) {
        // If both fail, PostgreSQL 13+ has gen_random_uuid() built-in, so we can continue
        // Railway typically uses PostgreSQL 13+, so this should work
      }
    }
    // Note: We use gen_random_uuid() throughout - it's built-in on PostgreSQL 13+
    // If using uuid-ossp, we'd need uuid_generate_v4(), but Railway likely has 13+

    // 2. Create organizations table
    const organizationsTableExists =
      await queryRunner.hasTable('organizations');
    if (!organizationsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'organizations',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'slug',
              type: 'varchar',
              length: '255',
              isUnique: true,
            },
            {
              name: 'status',
              type: 'varchar',
              default: "'trial'",
            },
            {
              name: 'website',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'industry',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'size',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'trial_ends_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'settings',
              type: 'jsonb',
              default: "'{}'",
            },
            {
              name: 'internal_managed',
              type: 'boolean',
              default: false,
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
          indices: [
            new TableIndex({
              name: 'IDX_organizations_slug',
              columnNames: ['slug'],
            }),
          ],
        }),
        true, // ifNotExists
      );
    }

    // 3. Create users table
    const usersTableExists = await queryRunner.hasTable('users');
    if (!usersTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isUnique: true,
            },
            {
              name: 'password',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'first_name',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            {
              name: 'last_name',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'is_email_verified',
              type: 'boolean',
              default: false,
            },
            {
              name: 'email_verified_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'role',
              type: 'varchar',
              length: '50',
              default: "'user'",
            },
            // NOTE: organization_id removed - user_organizations is the source of truth
            // Keep column for legacy compatibility but no FK constraint
            {
              name: 'organization_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'profile_picture',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'last_login_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'failed_login_attempts',
              type: 'integer',
              default: 0,
            },
            {
              name: 'locked_until',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'two_factor_enabled',
              type: 'boolean',
              default: false,
            },
            {
              name: 'two_factor_secret',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'email_verification_token',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'password_reset_token',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'last_password_change',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'email_verification_expires',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'password_reset_expires',
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
          foreignKeys: [
            // NOTE: No FK on organization_id - user_organizations is source of truth
            // organization_id kept for legacy compatibility only
          ],
          indices: [
            new TableIndex({
              name: 'IDX_users_email',
              columnNames: ['email'],
            }),
            // NOTE: Index on organization_id kept for legacy queries but column is deprecated
            new TableIndex({
              name: 'IDX_users_organization_id',
              columnNames: ['organization_id'],
            }),
          ],
        }),
        true, // ifNotExists
      );
    }

    // 4. Create user_organizations table (join table)
    const userOrganizationsTableExists =
      await queryRunner.hasTable('user_organizations');
    if (!userOrganizationsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'user_organizations',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            // NOTE: Using camelCase to match existing InitialProductionSchema migration
            {
              name: 'userId',
              type: 'uuid',
            },
            {
              name: 'organizationId',
              type: 'uuid',
            },
            {
              name: 'role',
              type: 'varchar',
              length: '50',
              default: "'viewer'",
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
            },
            {
              name: 'permissions',
              type: 'jsonb',
              default: "'{}'",
            },
            {
              name: 'joinedAt',
              type: 'date',
              isNullable: true,
            },
            {
              name: 'lastAccessAt',
              type: 'date',
              isNullable: true,
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
          foreignKeys: [
            {
              columnNames: ['userId'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
            {
              columnNames: ['organizationId'],
              referencedTableName: 'organizations',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
          ],
          indices: [
            new TableIndex({
              name: 'IDX_USER_ORG_USER_ID',
              columnNames: ['userId'],
            }),
            new TableIndex({
              name: 'IDX_USER_ORG_ORG_ID',
              columnNames: ['organizationId'],
            }),
            new TableIndex({
              name: 'IDX_USER_ORG_ACTIVE',
              columnNames: ['isActive'],
            }),
            new TableIndex({
              name: 'IDX_USER_ORG_ROLE',
              columnNames: ['role'],
            }),
          ],
        }),
        true, // ifNotExists
      );
    }

    // 5. Create workspaces table
    const workspacesTableExists = await queryRunner.hasTable('workspaces');
    if (!workspacesTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'workspaces',
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
            },
            {
              name: 'name',
              type: 'varchar',
              length: '100',
            },
            {
              name: 'slug',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'is_private',
              type: 'boolean',
              default: false,
            },
            {
              name: 'created_by',
              type: 'uuid',
            },
            {
              name: 'owner_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'permissions_config',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'default_methodology',
              type: 'varchar',
              length: '50',
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
            {
              name: 'deleted_by',
              type: 'uuid',
              isNullable: true,
            },
          ],
          foreignKeys: [
            {
              columnNames: ['organization_id'],
              referencedTableName: 'organizations',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
            {
              columnNames: ['created_by'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
            {
              columnNames: ['owner_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'SET NULL',
            },
          ],
          indices: [
            new TableIndex({
              name: 'IDX_workspaces_organization_id',
              columnNames: ['organization_id'],
            }),
            new TableIndex({
              name: 'IDX_workspaces_created_by',
              columnNames: ['created_by'],
            }),
            new TableIndex({
              name: 'IDX_workspaces_deleted_at',
              columnNames: ['deleted_at'],
            }),
          ],
        }),
        true, // ifNotExists
      );
    }

    // 6. Create projects table (minimal schema - will be extended by later migrations)
    const projectsTableExists = await queryRunner.hasTable('projects');
    if (!projectsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'projects',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
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
              type: 'varchar',
              length: '50',
              default: "'planning'",
            },
            {
              name: 'priority',
              type: 'varchar',
              length: '50',
              default: "'medium'",
            },
            {
              name: 'workspace_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'organization_id',
              type: 'uuid',
            },
            {
              name: 'project_manager_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'created_by_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'start_date',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'end_date',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'estimated_end_date',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'budget',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'actual_cost',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'risk_level',
              type: 'varchar',
              length: '50',
              default: "'medium'",
            },
            {
              name: 'size',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'methodology',
              type: 'varchar',
              length: '50',
              default: "'agile'",
            },
            {
              name: 'program_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'template_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'template_version',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'template_locked',
              type: 'boolean',
              default: false,
            },
            {
              name: 'template_snapshot',
              type: 'jsonb',
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
          foreignKeys: [
            {
              columnNames: ['workspace_id'],
              referencedTableName: 'workspaces',
              referencedColumnNames: ['id'],
              onDelete: 'SET NULL',
            },
            {
              columnNames: ['organization_id'],
              referencedTableName: 'organizations',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
            {
              columnNames: ['project_manager_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'SET NULL',
            },
            {
              columnNames: ['created_by_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'SET NULL',
            },
          ],
          indices: [
            new TableIndex({
              name: 'IDX_projects_status',
              columnNames: ['status'],
            }),
            new TableIndex({
              name: 'IDX_projects_organization_id',
              columnNames: ['organization_id'],
            }),
            new TableIndex({
              name: 'IDX_projects_workspace_id',
              columnNames: ['workspace_id'],
            }),
          ],
        }),
        true, // ifNotExists
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order (respecting foreign key dependencies)
    await queryRunner.dropTable('projects', true);
    await queryRunner.dropTable('workspaces', true);
    await queryRunner.dropTable('user_organizations', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('organizations', true);
  }
}
