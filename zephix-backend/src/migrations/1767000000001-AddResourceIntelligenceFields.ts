import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceIntelligenceFields1767000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types for AllocationType and BookingSource
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "allocation_type_enum" AS ENUM ('HARD', 'SOFT', 'GHOST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "booking_source_enum" AS ENUM ('MANUAL', 'JIRA', 'GITHUB', 'AI');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new columns to resource_allocations table
    // Default to HARD for existing rows (migration backfill requirement)
    await queryRunner.query(`
      ALTER TABLE "resource_allocations"
      ADD COLUMN IF NOT EXISTS "type" "allocation_type_enum" NOT NULL DEFAULT 'HARD'
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_allocations"
      ADD COLUMN IF NOT EXISTS "booking_source" "booking_source_enum" NOT NULL DEFAULT 'MANUAL'
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_allocations"
      ADD COLUMN IF NOT EXISTS "justification" text NULL
    `);

    // Backfill existing rows: set type = HARD and bookingSource = MANUAL
    // (This is already done by the DEFAULT values above, but explicit for clarity)
    await queryRunner.query(`
      UPDATE "resource_allocations"
      SET "type" = 'HARD', "booking_source" = 'MANUAL'
      WHERE "type" IS NULL OR "booking_source" IS NULL
    `);

    // Create indexes for type and booking_source filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_resource_allocations_type"
      ON "resource_allocations" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_resource_allocations_booking_source"
      ON "resource_allocations" ("booking_source")
    `);

    // Ensure organizations.settings column exists (should already exist, but make it idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "organizations"
        ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_resource_allocations_booking_source"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_resource_allocations_type"`,
    );

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "resource_allocations"
      DROP COLUMN IF EXISTS "justification"
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_allocations"
      DROP COLUMN IF EXISTS "booking_source"
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_allocations"
      DROP COLUMN IF EXISTS "type"
    `);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "booking_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "allocation_type_enum"`);
  }
}

