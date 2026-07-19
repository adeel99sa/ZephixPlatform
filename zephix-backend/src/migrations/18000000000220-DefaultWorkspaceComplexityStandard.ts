import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * New-workspace complexity default: 'lean' -> 'standard'.
 *
 * Operator ruling (2026-07-19): a new org/workspace should land in STANDARD —
 * gates present and warning, enforcement one toggle away — so the governance
 * value is VISIBLE and the block is opt-in. The previous DB default was 'lean',
 * where governance enforces nothing, and WorkspacesService.create() never sets
 * the mode — so every new workspace inherited 'lean' (the moat switched off out
 * of the box; staging 136/139 workspaces were 'lean' by this unset default).
 *
 * SCOPE: this changes the DEFAULT for FUTURE rows ONLY. Existing workspaces are
 * NOT backfilled — retroactively flipping a live workspace's governance mode
 * would surprise its users and is a per-workspace decision, not a default. The
 * demo/sandbox seed is set to GOVERNED separately (so a prospect sees the ban
 * actually work).
 */
export class DefaultWorkspaceComplexityStandard18000000000220
  implements MigrationInterface
{
  name = 'DefaultWorkspaceComplexityStandard18000000000220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" ALTER COLUMN "complexity_mode" SET DEFAULT 'standard'`,
    );
    // eslint-disable-next-line no-console
    console.log(
      '[complexity-default] workspaces.complexity_mode default set to STANDARD (future rows only; existing rows unchanged).',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" ALTER COLUMN "complexity_mode" SET DEFAULT 'lean'`,
    );
  }
}
