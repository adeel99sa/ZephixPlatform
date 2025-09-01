import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateResourceAllocationTable1756692157403 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists
        const tableExists = await queryRunner.hasTable('resource_allocations');
        
        if (!tableExists) {
            await queryRunner.createTable(new Table({
                name: 'resource_allocations',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'organization_id', type: 'uuid' },
                    { name: 'project_id', type: 'uuid' },
                    { name: 'resource_id', type: 'uuid' },
                    { name: 'user_id', type: 'uuid', isNullable: true },
                    { name: 'start_date', type: 'date' },
                    { name: 'end_date', type: 'date' },
                    { name: 'allocation_percentage', type: 'int' },
                    { name: 'work_item_id', type: 'uuid', isNullable: true },
                    { name: 'hours_per_day', type: 'decimal', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
                ]
            }));
            
            console.log('Created resource_allocations table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('resource_allocations', true);
    }
}