import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceTimelineSchema1758341426817 implements MigrationInterface {
    name = 'EnhanceTimelineSchema1758341426817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add timeline-specific columns to tasks table
        await queryRunner.query(`ALTER TABLE "tasks" ADD "duration_days" integer DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "completion_percentage" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "is_milestone" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "is_critical_path" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "planned_start" date`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "planned_end" date`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "actual_start" date`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "actual_end" date`);
        
        // Create indexes for timeline queries
        await queryRunner.query(`CREATE INDEX "idx_tasks_planned_start" ON "tasks" ("planned_start")`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_planned_end" ON "tasks" ("planned_end")`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_project_timeline" ON "tasks" ("project_id", "planned_start", "planned_end")`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_critical_path" ON "tasks" ("is_critical_path")`);
        
        // Update existing tasks to have planned dates if they have start/end dates
        await queryRunner.query(`
            UPDATE "tasks" 
            SET "planned_start" = "start_date", 
                "planned_end" = "end_date",
                "duration_days" = CASE 
                    WHEN "start_date" IS NOT NULL AND "end_date" IS NOT NULL 
                    THEN EXTRACT(DAY FROM ("end_date" - "start_date")) + 1
                    ELSE 1
                END
            WHERE "start_date" IS NOT NULL AND "end_date" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "idx_tasks_critical_path"`);
        await queryRunner.query(`DROP INDEX "idx_tasks_project_timeline"`);
        await queryRunner.query(`DROP INDEX "idx_tasks_planned_end"`);
        await queryRunner.query(`DROP INDEX "idx_tasks_planned_start"`);
        
        // Drop columns
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "actual_end"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "actual_start"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "planned_end"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "planned_start"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "is_critical_path"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "is_milestone"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "completion_percentage"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "duration_days"`);
    }
}