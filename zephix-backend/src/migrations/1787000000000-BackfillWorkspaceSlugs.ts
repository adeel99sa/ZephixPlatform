import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CLEANUP 1: Backfill missing workspace slugs
 *
 * Generates slugs for workspaces where slug is null or empty.
 * Ensures slugs are unique within organization.
 * Uses same slugify logic as workspace creation.
 */
export class BackfillWorkspaceSlugs1787000000000 implements MigrationInterface {
  /**
   * Slugify function matching workspace creation logic
   * Converts name to lowercase, replaces non-alphanumeric with hyphens,
   * collapses multiple hyphens, removes leading/trailing hyphens
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate unique slug within organization
   * If base slug exists, append short suffix (e.g., -1, -2)
   */
  private async generateUniqueSlug(
    queryRunner: QueryRunner,
    baseSlug: string,
    organizationId: string,
    excludeWorkspaceId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;

    while (true) {
      // Check if slug exists in this organization
      const existing = await queryRunner.query(
        `
        SELECT id FROM workspaces
        WHERE organization_id = $1
        AND slug = $2
        AND deleted_at IS NULL
        ${excludeWorkspaceId ? 'AND id != $3' : ''}
      `,
        excludeWorkspaceId
          ? [organizationId, slug, excludeWorkspaceId]
          : [organizationId, slug],
      );

      if (existing.length === 0) {
        return slug;
      }

      // Slug exists, try with suffix
      suffix++;
      slug = `${baseSlug}-${suffix}`;

      // Safety: prevent infinite loop (max 1000 attempts)
      if (suffix > 1000) {
        // Fallback: use UUID short prefix
        const uuidPrefix = await queryRunner.query(
          `SELECT SUBSTRING(gen_random_uuid()::text, 1, 8) as prefix`,
        );
        slug = `${baseSlug}-${uuidPrefix[0].prefix}`;
        break;
      }
    }

    return slug;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all workspaces with null or empty slug
    const workspacesWithoutSlug = await queryRunner.query(`
      SELECT id, name, organization_id
      FROM workspaces
      WHERE (slug IS NULL OR slug = '')
      AND deleted_at IS NULL
      ORDER BY created_at ASC
    `);

    console.log(
      `[BackfillWorkspaceSlugs] Found ${workspacesWithoutSlug.length} workspaces without slugs`,
    );

    // Process each workspace
    for (const workspace of workspacesWithoutSlug) {
      const { id, name, organization_id } = workspace;

      if (!name || name.trim().length === 0) {
        // Skip workspaces with empty names (shouldn't happen, but safe)
        console.warn(
          `[BackfillWorkspaceSlugs] Skipping workspace ${id} - empty name`,
        );
        continue;
      }

      // Generate base slug from name
      const baseSlug = this.slugify(name);

      if (baseSlug.length === 0) {
        // Name had no valid characters, use fallback
        const fallbackSlug = `workspace-${id.substring(0, 8)}`;
        await queryRunner.query(
          `
          UPDATE workspaces
          SET slug = $1
          WHERE id = $2
        `,
          [fallbackSlug, id],
        );
        console.log(
          `[BackfillWorkspaceSlugs] Workspace ${id}: Used fallback slug ${fallbackSlug}`,
        );
        continue;
      }

      // Ensure uniqueness within organization
      const uniqueSlug = await this.generateUniqueSlug(
        queryRunner,
        baseSlug,
        organization_id,
        id,
      );

      // Update workspace with generated slug
      await queryRunner.query(
        `
        UPDATE workspaces
        SET slug = $1
        WHERE id = $2
      `,
        [uniqueSlug, id],
      );

      console.log(
        `[BackfillWorkspaceSlugs] Workspace ${id} (${name}): Generated slug ${uniqueSlug}`,
      );
    }

    // Verify: count workspaces with null slug should be 0
    const nullSlugCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM workspaces
      WHERE slug IS NULL
      AND deleted_at IS NULL
    `);

    if (parseInt(nullSlugCount[0]?.count || '0', 10) > 0) {
      throw new Error(
        `[BackfillWorkspaceSlugs] Verification failed: ${nullSlugCount[0].count} workspaces still have null slug`,
      );
    }

    // Verify: no duplicate slugs within same organization
    const duplicates = await queryRunner.query(`
      SELECT organization_id, slug, COUNT(*) as count
      FROM workspaces
      WHERE slug IS NOT NULL
      AND deleted_at IS NULL
      GROUP BY organization_id, slug
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      throw new Error(
        `[BackfillWorkspaceSlugs] Verification failed: Found duplicate slugs within organizations`,
      );
    }

    console.log(
      `[BackfillWorkspaceSlugs] ✅ Successfully backfilled all workspace slugs`,
    );

    // Optional: Add NOT NULL constraint to prevent future null slugs
    // Uncomment if you want to enforce slug is always set for new workspaces
    // Note: This is safe because workspace creation logic always generates a slug
    /*
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ALTER COLUMN "slug" SET NOT NULL
    `);
    console.log(`[BackfillWorkspaceSlugs] ✅ Added NOT NULL constraint to slug column`);
    */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: We cannot safely revert this migration as we don't know
    // which workspaces originally had null slugs vs. which had slugs.
    // This is a one-way migration.
    console.warn(
      `[BackfillWorkspaceSlugs] Down migration not supported - cannot determine original state`,
    );
  }
}
