import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DOC-TENANT-1 — add documents.organization_id so the standalone document
 * surface can be brought under TenantAwareRepository / @WorkspaceScoped.
 *
 * Cause (fixed at source, same PR): DocumentEntity had only workspace_id +
 * project_id and no organization_id, so the tenant guardrail could not scope
 * it. The controller carried JwtAuthGuard only (no workspace-membership check),
 * and the service queried a plain repo by the URL workspace/project. Combined
 * with the interceptor's header-first workspace resolution (x-workspace-id
 * validated against the caller's org, while the URL workspace/project drive the
 * query), a caller in org A could read/write org B's documents.
 *
 * Backfill: documents inherit their org from the parent project
 * (documents.project_id -> projects.organization_id). projects.organization_id
 * is NOT NULL, so every document with a resolvable project gets a definite org.
 *
 * Orphans (project_id with no matching projects row) are NEVER guessed — they
 * are counted and logged, and the column is left nullable if any remain so the
 * deploy does not fail. With zero orphans the column is set NOT NULL in the
 * same transaction.
 *
 * IDEMPOTENT: add-column guarded by IF NOT EXISTS; backfill only touches
 * organization_id IS NULL rows; SET NOT NULL runs only when no NULLs remain.
 * Transaction mode is 'each' (one tx per migration).
 */
export class AddDocumentsOrganizationId18000000000216
  implements MigrationInterface
{
  name = 'AddDocumentsOrganizationId18000000000216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the column nullable so we can backfill before enforcing NOT NULL.
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );

    // 2. Count-first: how many rows, how many resolvable, how many orphaned.
    const [pre] = await queryRunner.query(`
      SELECT
        count(*)                                            AS total,
        count(*) FILTER (WHERE d.organization_id IS NULL)   AS null_org,
        count(*) FILTER (
          WHERE d.organization_id IS NULL AND p.organization_id IS NOT NULL
        )                                                   AS resolvable,
        count(*) FILTER (
          WHERE d.organization_id IS NULL AND p.id IS NULL
        )                                                   AS orphan
      FROM documents d
      LEFT JOIN projects p ON p.id = d.project_id;
    `);
    // eslint-disable-next-line no-console
    console.log(
      `[DOC-TENANT-1 backfill] documents total=${pre.total} ` +
        `null_org=${pre.null_org} resolvable=${pre.resolvable} ` +
        `orphan(no-project)=${pre.orphan}`,
    );

    // 3. Backfill org from the parent project. Only touches NULL rows.
    const filled = await queryRunner.query(`
      UPDATE documents d
      SET organization_id = p.organization_id
      FROM projects p
      WHERE p.id = d.project_id
        AND d.organization_id IS NULL
      RETURNING d.id;
    `);
    const backfilled = Array.isArray(filled) ? filled.length : 0;
    // eslint-disable-next-line no-console
    console.log(
      `[DOC-TENANT-1 backfill] backfilled ${backfilled} document(s) from parent project.`,
    );

    // 4. Re-check remaining NULLs (orphans that could not be resolved).
    const [post] = await queryRunner.query(
      `SELECT count(*) AS remaining FROM documents WHERE organization_id IS NULL;`,
    );
    const remaining = Number(post.remaining);

    // 5. Index for the new org filter regardless of NOT NULL outcome.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_documents_organization_id" ON "documents" ("organization_id")`,
    );

    if (remaining === 0) {
      await queryRunner.query(
        `ALTER TABLE "documents" ALTER COLUMN "organization_id" SET NOT NULL`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `[DOC-TENANT-1 backfill] organization_id set NOT NULL (0 orphans).`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[DOC-TENANT-1 backfill] ${remaining} orphan document(s) have no ` +
          `resolvable project; organization_id LEFT NULLABLE. Reconcile these ` +
          `rows and re-run a follow-up SET NOT NULL. NOT guessing an org.`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_documents_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP COLUMN IF EXISTS "organization_id"`,
    );
  }
}
