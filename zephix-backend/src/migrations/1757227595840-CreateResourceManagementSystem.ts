import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateResourceManagementSystem1757227595840 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create resources table if not exists
    const resourcesTableExists = await queryRunner.hasTable('resources');
    
    if (!resourcesTableExists) {
      await queryRunner.createTable(new Table({
        name: 'resources',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()'
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'role',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'skills',
            type: 'jsonb',
            default: "'[]'"
          },
          {
            name: 'capacity_hours_per_week',
            type: 'integer',
            default: 40
          },
          {
            name: 'cost_per_hour',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true
          },
          {
            name: 'preferences',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          },
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ],
        indices: [
          {
            name: 'idx_resources_org',
            columnNames: ['organization_id']
          },
          {
            name: 'idx_resources_user',
            columnNames: ['user_id']
          },
          {
            name: 'idx_resources_active',
            columnNames: ['is_active']
          }
        ]
      }), true);
    }

    // 2. Check if resource_allocations table exists and update if needed
    const allocationsTableExists = await queryRunner.hasTable('resource_allocations');
    
    if (!allocationsTableExists) {
      await queryRunner.createTable(new Table({
        name: 'resource_allocations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()'
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'resource_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true
          },
          {
            name: 'allocation_percentage',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['resource_id'],
            referencedTableName: 'resources',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ],
        indices: [
          {
            name: 'idx_ra_dates',
            columnNames: ['start_date', 'end_date']
          },
          {
            name: 'idx_ra_org_resource',
            columnNames: ['organization_id', 'resource_id']
          }
        ]
      }), true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('resource_allocations', true);
    await queryRunner.dropTable('resources', true);
  }
}
