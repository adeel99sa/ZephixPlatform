import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFavorites18000000000060 implements MigrationInterface {
  name = 'CreateFavorites18000000000060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "item_type" varchar(50) NOT NULL,
        "item_id" uuid NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_favorites_user_item" UNIQUE ("user_id", "item_type", "item_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_favorites_user_id" ON "favorites" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_favorites_user_org" ON "favorites" ("user_id", "organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "favorites"`);
  }
}
