import { MigrationInterface, QueryRunner } from "typeorm";

export class StatusReporting20250810 implements MigrationInterface {
    name = 'StatusReporting20250810'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create status_reports table
        await queryRunner.query(`
            CREATE TABLE "status_reports" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "project_id" uuid NOT NULL,
                "report_date" date NOT NULL,
                "status" character varying NOT NULL DEFAULT 'draft',
                "summary" text,
                "key_achievements" text,
                "challenges" text,
                "next_steps" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_status_reports" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "status_reports" 
            ADD CONSTRAINT "FK_status_reports_project" 
            FOREIGN KEY ("project_id") 
            REFERENCES "projects"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_project_id" 
            ON "status_reports" ("project_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_report_date" 
            ON "status_reports" ("report_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_status" 
            ON "status_reports" ("status")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_status_reports_status"`);
        await queryRunner.query(`DROP INDEX "IDX_status_reports_report_date"`);
        await queryRunner.query(`DROP INDEX "IDX_status_reports_project_id"`);

        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "status_reports" DROP CONSTRAINT "FK_status_reports_project"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "status_reports"`);
    }
}
