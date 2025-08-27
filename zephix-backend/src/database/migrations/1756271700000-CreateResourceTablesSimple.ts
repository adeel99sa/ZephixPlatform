import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResourceTablesSimple1756271700000 implements MigrationInterface {
  name = 'CreateResourceTablesSimple1756271700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create resource_allocations table
    await queryRunner.query(`
      CREATE TABLE "resource_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "taskId" uuid,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "allocationPercentage" numeric(5,2) NOT NULL,
        "hoursPerDay" integer NOT NULL DEFAULT 8,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resource_allocations" PRIMARY KEY ("id")
      )
    `);

    // Create resource_conflicts table
    await queryRunner.query(`
      CREATE TABLE "resource_conflicts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resourceId" character varying NOT NULL,
        "conflictDate" date NOT NULL,
        "totalAllocation" numeric(5,2) NOT NULL,
        "affectedProjects" jsonb NOT NULL,
        "severity" character varying NOT NULL,
        "resolved" boolean NOT NULL DEFAULT false,
        "detectedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resolvedAt" TIMESTAMP,
        CONSTRAINT "PK_resource_conflicts" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_resource_allocations_resource_date" 
      ON "resource_allocations" ("resourceId", "startDate", "endDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_resource_allocations_project" 
      ON "resource_allocations" ("projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_resource_conflicts_resource_date" 
      ON "resource_conflicts" ("resourceId", "conflictDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_resource_conflicts_severity" 
      ON "resource_conflicts" ("severity")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_resource_conflicts_severity"`);
    await queryRunner.query(`DROP INDEX "IDX_resource_conflicts_resource_date"`);
    await queryRunner.query(`DROP INDEX "IDX_resource_allocations_project"`);
    await queryRunner.query(`DROP INDEX "IDX_resource_allocations_resource_date"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "resource_conflicts"`);
    await queryRunner.query(`DROP TABLE "resource_allocations"`);
  }
}
