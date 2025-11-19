import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspacesTable1761436371432 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "workspaces" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "slug" character varying(50),
                "description" text,
                "is_private" boolean NOT NULL DEFAULT false,
                "organization_id" uuid NOT NULL,
                "created_by" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                "deleted_by" uuid,
                CONSTRAINT "PK_workspaces" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_workspaces_organization_id" ON "workspaces" ("organization_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_workspaces_created_by" ON "workspaces" ("created_by")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_workspaces_deleted_at" ON "workspaces" ("deleted_at")
        `);

    await queryRunner.query(`
            ALTER TABLE "workspaces"
            ADD CONSTRAINT "FK_workspaces_organization"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "workspaces"
            ADD CONSTRAINT "FK_workspaces_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_workspaces_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_workspaces_organization"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_workspaces_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_workspaces_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_workspaces_organization_id"`);
    await queryRunner.query(`DROP TABLE "workspaces"`);
  }
}
