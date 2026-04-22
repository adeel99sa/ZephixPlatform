import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product clarity: legacy auto-created sample project used the name "Welcome to Zephix",
 * which users read as onboarding chrome rather than a real sibling project.
 *
 * Idempotent: only rows with the exact legacy title are updated.
 */
const LEGACY_NAME = 'Welcome to Zephix';
const NEW_NAME = 'Sample: Zephix walkthrough';

export class RenameLegacyWelcomeToZephixSampleProject18000000000064
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE projects SET name = $1 WHERE name = $2`,
      [NEW_NAME, LEGACY_NAME],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE projects SET name = $1 WHERE name = $2`,
      [LEGACY_NAME, NEW_NAME],
    );
  }
}
