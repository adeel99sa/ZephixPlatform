import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Build 1 (RBAC foundations) — additive schema changes only.
 *
 * Three additions, no destructive ops:
 *
 * 1. users — encrypted MFA columns + grace-period field
 *    - mfa_enabled (BOOLEAN, default false)
 *    - mfa_secret_ciphertext (BYTEA, nullable) — AES-256-GCM ciphertext
 *    - mfa_secret_iv (BYTEA, nullable) — 96-bit GCM IV per row
 *    - mfa_secret_auth_tag (BYTEA, nullable) — 128-bit GCM auth tag
 *    - mfa_grace_until (TIMESTAMPTZ, nullable) — admin grace-period state
 *
 *    Pre-existing dead plaintext columns (two_factor_enabled,
 *    two_factor_secret) are NOT dropped here. Staging DB confirms 0 rows
 *    have two_factor_enabled = true (verified at recon time, 2026-05-08),
 *    so no rotation plan needed. Drop migration deferred to PR2 (cutover)
 *    or follow-up cleanup so PR1 is purely additive.
 *
 * 2. auth_sessions — refresh-token family rotation (ADR-002 amended)
 *    - family_id (UUID NOT NULL, defaults gen_random_uuid())
 *    - parent_session_id (UUID, nullable, FK self-ref ON DELETE SET NULL)
 *    - replaced_at (TIMESTAMPTZ, nullable) — set when rotated
 *    - replaced_by_session_id (UUID, nullable, FK self-ref ON DELETE SET NULL)
 *    - Index IDX_auth_sessions_family_id
 *
 *    Existing rows receive a unique random family_id at column-add time.
 *    Each legacy session is therefore its own family — semantically
 *    equivalent to "family_id = id" for grandfathered sessions. Reuse
 *    detection logic (family-wide invalidation on consumed-token reuse)
 *    is wired in PR2 (cutover) — schema is the prerequisite here.
 *
 * 3. workspace_invitations — new table for workspace-scoped invitations
 *    Distinct from org_invites (org-level, with optional workspace
 *    assignments stored separately) and from the legacy organizations.
 *    invitations table (deprecated; see RBAC v3.5 cleanup R5 in
 *    docs/known-debt/pre-paying-customers.md).
 *
 *    Hashed token only at rest (HMAC-SHA256 via TokenHashUtil), 7-day
 *    expiry, single-use via accepted_at, role stored as workspace_role
 *    string (matches WorkspaceMember.role storage).
 *
 * All structures gated at the application layer by RBAC_V2_ENABLED
 * feature flag (default false in PR1). Tables/columns are inert until
 * the flag flips in PR2 cutover.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §5.1.
 */
export class RbacFoundationsAdditive18000000000150
  implements MigrationInterface
{
  name = 'RbacFoundationsAdditive18000000000150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users — MFA encrypted columns + grace
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "mfa_secret_ciphertext" BYTEA,
        ADD COLUMN IF NOT EXISTS "mfa_secret_iv" BYTEA,
        ADD COLUMN IF NOT EXISTS "mfa_secret_auth_tag" BYTEA,
        ADD COLUMN IF NOT EXISTS "mfa_grace_until" TIMESTAMPTZ
    `);

    // 2. auth_sessions — refresh-token family rotation columns
    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
        ADD COLUMN IF NOT EXISTS "family_id" UUID NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS "parent_session_id" UUID,
        ADD COLUMN IF NOT EXISTS "replaced_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "replaced_by_session_id" UUID
    `);

    // FKs added separately so IF NOT EXISTS works on column adds (PG ALTER TABLE
    // ADD CONSTRAINT does not support IF NOT EXISTS until PG 14; guard with a
    // catalog check for back-compat).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_auth_sessions_parent'
        ) THEN
          ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_auth_sessions_parent"
            FOREIGN KEY ("parent_session_id")
            REFERENCES "auth_sessions"("id")
            ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_auth_sessions_replaced_by'
        ) THEN
          ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_auth_sessions_replaced_by"
            FOREIGN KEY ("replaced_by_session_id")
            REFERENCES "auth_sessions"("id")
            ON DELETE SET NULL;
        END IF;
      END$$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_sessions_family_id"
      ON "auth_sessions" ("family_id")
    `);

    // 3. workspace_invitations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_invitations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "invited_workspace_role" VARCHAR(64) NOT NULL,
        "invited_by" UUID NOT NULL,
        "token_hash" CHAR(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "accepted_at" TIMESTAMPTZ,
        "accepted_by_user_id" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_workspace_invitations_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_workspace_invitations_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_invitations_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_invitations_invited_by"
          FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_workspace_invitations_accepted_by"
          FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invitations_email"
      ON "workspace_invitations" ("email")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invitations_workspace"
      ON "workspace_invitations" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invitations_token_hash"
      ON "workspace_invitations" ("token_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order — workspace_invitations table first (no dependents),
    // then auth_sessions cols + indexes, then users cols.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invitations_token_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invitations_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workspace_invitations_email"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_invitations"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_family_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
        DROP CONSTRAINT IF EXISTS "FK_auth_sessions_replaced_by",
        DROP CONSTRAINT IF EXISTS "FK_auth_sessions_parent",
        DROP COLUMN IF EXISTS "replaced_by_session_id",
        DROP COLUMN IF EXISTS "replaced_at",
        DROP COLUMN IF EXISTS "parent_session_id",
        DROP COLUMN IF EXISTS "family_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "mfa_grace_until",
        DROP COLUMN IF EXISTS "mfa_secret_auth_tag",
        DROP COLUMN IF EXISTS "mfa_secret_iv",
        DROP COLUMN IF EXISTS "mfa_secret_ciphertext",
        DROP COLUMN IF EXISTS "mfa_enabled"
    `);
  }
}
