import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * PHASE 6: Migrate Portfolios and Programs to Workspace-Scoped
 *
 * Strategy:
 * 1. Add workspace_id columns (nullable initially)
 * 2. Backfill workspace_id from linked projects
 * 3. Handle multi-workspace portfolios/programs by splitting
 * 4. Set NOT NULL constraints
 * 5. Add indexes and update unique constraints
 */
export class MigratePortfoliosProgramsToWorkspaceScoped1788000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Phase6Migration] Starting workspace-scoped migration...');

    // Step 1: Add workspace_id columns (nullable)
    const portfoliosTable = await queryRunner.getTable('portfolios');
    if (portfoliosTable) {
      const workspaceIdColumn =
        portfoliosTable.findColumnByName('workspace_id');
      if (!workspaceIdColumn) {
        await queryRunner.addColumn(
          'portfolios',
          new TableColumn({
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          }),
        );
        console.log('[Phase6Migration] Added workspace_id to portfolios');
      }
    }

    const programsTable = await queryRunner.getTable('programs');
    if (programsTable) {
      const workspaceIdColumn = programsTable.findColumnByName('workspace_id');
      if (!workspaceIdColumn) {
        await queryRunner.addColumn(
          'programs',
          new TableColumn({
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          }),
        );
        console.log('[Phase6Migration] Added workspace_id to programs');
      }
    }

    // Step 2: Backfill portfolios.workspace_id
    await this.backfillPortfolioWorkspaces(queryRunner);

    // Step 3: Backfill programs.workspace_id
    await this.backfillProgramWorkspaces(queryRunner);

    // Step 4: Handle portfolios that still have null workspace_id
    await this.handleOrphanedPortfolios(queryRunner);

    // Step 5: Handle programs that still have null workspace_id
    await this.handleOrphanedPrograms(queryRunner);

    // Step 6: Verify no nulls remain
    await this.verifyNoNulls(queryRunner);

    // Step 7: Set NOT NULL constraints
    await queryRunner.query(`
      ALTER TABLE portfolios
      ALTER COLUMN workspace_id SET NOT NULL
    `);
    console.log('[Phase6Migration] Set portfolios.workspace_id NOT NULL');

    await queryRunner.query(`
      ALTER TABLE programs
      ALTER COLUMN workspace_id SET NOT NULL
    `);
    console.log('[Phase6Migration] Set programs.workspace_id NOT NULL');

    // Step 8: Add portfolioId to projects (nullable, can derive from program)
    const projectsTable = await queryRunner.getTable('projects');
    if (projectsTable) {
      const portfolioIdColumn = projectsTable.findColumnByName('portfolio_id');
      if (!portfolioIdColumn) {
        await queryRunner.addColumn(
          'projects',
          new TableColumn({
            name: 'portfolio_id',
            type: 'uuid',
            isNullable: true,
          }),
        );

        // Add foreign key
        await queryRunner.query(`
          ALTER TABLE projects
          ADD CONSTRAINT "FK_projects_portfolio"
          FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id")
          ON DELETE SET NULL
        `);

        // Backfill portfolioId from program.portfolioId for existing projects
        await queryRunner.query(`
          UPDATE projects p
          SET portfolio_id = pr.portfolio_id
          FROM programs pr
          WHERE p.program_id = pr.id
          AND p.portfolio_id IS NULL
        `);

        console.log(
          '[Phase6Migration] Added portfolio_id to projects and backfilled from programs',
        );
      }
    }

    // Step 9: Add indexes
    await queryRunner.createIndex(
      'portfolios',
      new TableIndex({
        name: 'idx_portfolio_org_workspace',
        columnNames: ['organization_id', 'workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'programs',
      new TableIndex({
        name: 'idx_program_org_workspace',
        columnNames: ['organization_id', 'workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'programs',
      new TableIndex({
        name: 'idx_program_org_workspace_portfolio',
        columnNames: ['organization_id', 'workspace_id', 'portfolio_id'],
      }),
    );

    // Update unique constraints: portfolio unique per workspace, program unique per portfolio
    // Drop old unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_portfolio_org_name"
    `);

    // Create new unique index: (workspace_id, name) - case insensitive if possible
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_portfolio_workspace_name"
      ON "portfolios" ("workspace_id", LOWER("name"))
      WHERE "status" != 'archived'
    `);

    // Drop old program unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_program_org_portfolio_name"
    `);

    // Create new unique index: (portfolio_id, name) - case insensitive
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_program_portfolio_name"
      ON "programs" ("portfolio_id", LOWER("name"))
      WHERE "status" != 'archived'
    `);

    console.log('[Phase6Migration] ✅ Workspace-scoped migration complete');
  }

  /**
   * Helper: Get column name from candidates (handles snake_case and camelCase)
   */
  private async getColumnName(
    queryRunner: QueryRunner,
    table: string,
    candidates: string[],
  ): Promise<string | null> {
    const result = await queryRunner.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name IN (${candidates.map((_, i) => `$${i + 2}`).join(', ')})
      LIMIT 1
    `,
      [table, ...candidates],
    );
    return result.length > 0 ? result[0].column_name : null;
  }

  /**
   * Backfill portfolio workspace_id from linked projects
   */
  private async backfillPortfolioWorkspaces(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Detect column names (handle both snake_case and camelCase)
    const orgCol = await this.getColumnName(queryRunner, 'portfolios', [
      'organization_id',
      'organizationId',
    ]);
    const createdByCol = await this.getColumnName(queryRunner, 'portfolios', [
      'created_by_id',
      'createdById',
    ]);

    if (!orgCol) {
      throw new Error(
        'Migration failed: Could not find organization column in portfolios table. Candidates: organization_id, organizationId',
      );
    }

    // Get all portfolios using detected column names (quote identifiers)
    const portfolios = await queryRunner.query(`
      SELECT id, "${orgCol}" as organization_id, name, ${createdByCol ? `"${createdByCol}" as created_by_id` : 'NULL as created_by_id'}
      FROM portfolios
      WHERE workspace_id IS NULL
    `);

    console.log(
      `[Phase6Migration] Found ${portfolios.length} portfolios to backfill`,
    );

    for (const portfolio of portfolios) {
      // Find linked projects via portfolio_projects
      const linkedProjects = await queryRunner.query(
        `
        SELECT DISTINCT p.workspace_id, COUNT(*) as project_count
        FROM portfolio_projects pp
        INNER JOIN projects p ON pp.project_id = p.id
        WHERE pp.portfolio_id = $1
        AND p.workspace_id IS NOT NULL
        GROUP BY p.workspace_id
        ORDER BY project_count DESC
      `,
        [portfolio.id],
      );

      if (linkedProjects.length === 0) {
        // No linked projects - will handle in handleOrphanedPortfolios
        console.log(
          `[Phase6Migration] Portfolio ${portfolio.id} has no linked projects - will handle separately`,
        );
        continue;
      }

      if (linkedProjects.length === 1) {
        // All projects in one workspace - simple case
        const workspaceId = linkedProjects[0].workspace_id;
        await queryRunner.query(
          `UPDATE portfolios SET workspace_id = $1 WHERE id = $2`,
          [workspaceId, portfolio.id],
        );
        console.log(
          `[Phase6Migration] Portfolio ${portfolio.id} assigned to workspace ${workspaceId}`,
        );
      } else {
        // Projects span multiple workspaces - split portfolio
        console.log(
          `[Phase6Migration] Portfolio ${portfolio.id} spans ${linkedProjects.length} workspaces - splitting...`,
        );
        await this.splitPortfolioAcrossWorkspaces(
          queryRunner,
          portfolio,
          linkedProjects,
        );
      }
    }
  }

  /**
   * Split portfolio across multiple workspaces
   */
  private async splitPortfolioAcrossWorkspaces(
    queryRunner: QueryRunner,
    portfolio: any,
    workspaceGroups: Array<{ workspace_id: string; project_count: number }>,
  ): Promise<void> {
    // Get workspace names for naming
    const workspaceNames = await queryRunner.query(
      `
      SELECT id, name, slug
      FROM workspaces
      WHERE id = ANY($1::uuid[])
    `,
      [workspaceGroups.map((g) => g.workspace_id)],
    );
    const workspaceMap = new Map(workspaceNames.map((w: any) => [w.id, w]));

    // Archive original portfolio
    await queryRunner.query(
      `UPDATE portfolios SET status = 'archived' WHERE id = $1`,
      [portfolio.id],
    );

    // Create one portfolio per workspace
    for (const group of workspaceGroups) {
      const workspace: any = workspaceMap.get(group.workspace_id);
      const workspaceName = workspace?.name || workspace?.slug || 'Unknown';
      const newPortfolioName = `${portfolio.name} (${workspaceName})`;

      // Create new portfolio - use detected column names
      const orgCol = await this.getColumnName(queryRunner, 'portfolios', [
        'organization_id',
        'organizationId',
      ]);
      const createdByCol = await this.getColumnName(queryRunner, 'portfolios', [
        'created_by_id',
        'createdById',
      ]);

      if (!orgCol) {
        throw new Error(
          'Migration failed: Could not find organization column in portfolios table',
        );
      }

      const newPortfolioResult = await queryRunner.query(
        `
        INSERT INTO portfolios (id, "${orgCol}", workspace_id, name, description, status, ${createdByCol ? `"${createdByCol}"` : 'NULL'}, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, ${createdByCol ? '$6' : 'NULL'}, NOW(), NOW())
        RETURNING id
      `,
        createdByCol
          ? [
              portfolio.organization_id,
              group.workspace_id,
              newPortfolioName,
              portfolio.description || null,
              'active',
              portfolio.created_by_id || null,
            ]
          : [
              portfolio.organization_id,
              group.workspace_id,
              newPortfolioName,
              portfolio.description || null,
              'active',
            ],
      );
      const newPortfolioId = newPortfolioResult[0].id;

      // Re-link portfolio_projects for this workspace
      await queryRunner.query(
        `
        UPDATE portfolio_projects
        SET portfolio_id = $1
        WHERE portfolio_id = $2
        AND project_id IN (
          SELECT id FROM projects WHERE workspace_id = $3
        )
      `,
        [newPortfolioId, portfolio.id, group.workspace_id],
      );

      // Re-link programs to new portfolio
      await queryRunner.query(
        `
        UPDATE programs
        SET portfolio_id = $1, workspace_id = $2
        WHERE portfolio_id = $3
        AND id IN (
          SELECT DISTINCT p.program_id
          FROM projects p
          WHERE p.workspace_id = $2
          AND p.program_id IS NOT NULL
        )
      `,
        [newPortfolioId, group.workspace_id, portfolio.id],
      );

      console.log(
        `[Phase6Migration] Created portfolio ${newPortfolioId} for workspace ${group.workspace_id}`,
      );
    }
  }

  /**
   * Backfill program workspace_id from linked projects
   */
  private async backfillProgramWorkspaces(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Detect column names
    const orgCol = await this.getColumnName(queryRunner, 'programs', [
      'organization_id',
      'organizationId',
    ]);

    if (!orgCol) {
      throw new Error(
        'Migration failed: Could not find organization column in programs table. Candidates: organization_id, organizationId',
      );
    }

    // Get all programs using detected column names
    const programs = await queryRunner.query(`
      SELECT id, "${orgCol}" as organization_id, portfolio_id, name
      FROM programs
      WHERE workspace_id IS NULL
    `);

    console.log(
      `[Phase6Migration] Found ${programs.length} programs to backfill`,
    );

    for (const program of programs) {
      // Find projects linked to this program
      const linkedProjects = await queryRunner.query(
        `
        SELECT DISTINCT workspace_id, COUNT(*) as project_count
        FROM projects
        WHERE program_id = $1
        AND workspace_id IS NOT NULL
        GROUP BY workspace_id
        ORDER BY project_count DESC
      `,
        [program.id],
      );

      if (linkedProjects.length === 0) {
        // No linked projects - will handle in handleOrphanedPrograms
        console.log(
          `[Phase6Migration] Program ${program.id} has no linked projects - will handle separately`,
        );
        continue;
      }

      if (linkedProjects.length === 1) {
        // All projects in one workspace
        const workspaceId = linkedProjects[0].workspace_id;
        await queryRunner.query(
          `UPDATE programs SET workspace_id = $1 WHERE id = $2`,
          [workspaceId, program.id],
        );
        console.log(
          `[Phase6Migration] Program ${program.id} assigned to workspace ${workspaceId}`,
        );
      } else {
        // Projects span multiple workspaces - split program
        console.log(
          `[Phase6Migration] Program ${program.id} spans ${linkedProjects.length} workspaces - splitting...`,
        );
        await this.splitProgramAcrossWorkspaces(
          queryRunner,
          program,
          linkedProjects,
        );
      }
    }
  }

  /**
   * Split program across multiple workspaces
   */
  private async splitProgramAcrossWorkspaces(
    queryRunner: QueryRunner,
    program: any,
    workspaceGroups: Array<{ workspace_id: string; project_count: number }>,
  ): Promise<void> {
    // Get workspace names
    const workspaceNames = await queryRunner.query(
      `
      SELECT id, name, slug
      FROM workspaces
      WHERE id = ANY($1::uuid[])
    `,
      [workspaceGroups.map((g) => g.workspace_id)],
    );
    const workspaceMap = new Map(workspaceNames.map((w: any) => [w.id, w]));

    // Find portfolio for each workspace (portfolio should have been assigned by now)
    const portfoliosByWorkspace = await queryRunner.query(
      `
      SELECT DISTINCT workspace_id, portfolio_id
      FROM portfolios
      WHERE organization_id = $1
      AND workspace_id = ANY($2::uuid[])
    `,
      [program.organization_id, workspaceGroups.map((g) => g.workspace_id)],
    );
    const portfolioMap = new Map(
      portfoliosByWorkspace.map((p: any) => [p.workspace_id, p.portfolio_id]),
    );

    // Archive original program
    await queryRunner.query(
      `UPDATE programs SET status = 'archived' WHERE id = $1`,
      [program.id],
    );

    // Create one program per workspace
    for (const group of workspaceGroups) {
      const workspace: any = workspaceMap.get(group.workspace_id);
      const workspaceName = workspace?.name || workspace?.slug || 'Unknown';
      const newProgramName = `${program.name} (${workspaceName})`;

      // Find or create portfolio in this workspace - use detected column names
      let portfolioId = portfolioMap.get(group.workspace_id);
      if (!portfolioId) {
        const portfolioOrgCol = await this.getColumnName(
          queryRunner,
          'portfolios',
          ['organization_id', 'organizationId'],
        );
        if (!portfolioOrgCol) {
          throw new Error(
            'Migration failed: Could not find organization column in portfolios table',
          );
        }
        // Create default portfolio for this workspace
        const defaultPortfolioResult = await queryRunner.query(
          `
          INSERT INTO portfolios (id, "${portfolioOrgCol}", workspace_id, name, status, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, 'Default Portfolio', 'active', NOW(), NOW())
          RETURNING id
        `,
          [program.organization_id, group.workspace_id],
        );
        portfolioId = defaultPortfolioResult[0].id;
      }

      // Create new program - use detected column names
      const programOrgCol = await this.getColumnName(queryRunner, 'programs', [
        'organization_id',
        'organizationId',
      ]);
      if (!programOrgCol) {
        throw new Error(
          'Migration failed: Could not find organization column in programs table',
        );
      }
      const newProgramResult = await queryRunner.query(
        `
        INSERT INTO programs (id, "${programOrgCol}", portfolio_id, workspace_id, name, description, status, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `,
        [
          program.organization_id,
          portfolioId,
          group.workspace_id,
          newProgramName,
          program.description || null,
          'active',
        ],
      );
      const newProgramId = newProgramResult[0].id;

      // Re-link projects to new program
      await queryRunner.query(
        `
        UPDATE projects
        SET program_id = $1
        WHERE program_id = $2
        AND workspace_id = $3
      `,
        [newProgramId, program.id, group.workspace_id],
      );

      console.log(
        `[Phase6Migration] Created program ${newProgramId} for workspace ${group.workspace_id}`,
      );
    }
  }

  /**
   * Handle portfolios with no linked projects
   */
  private async handleOrphanedPortfolios(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Detect column names
    const orgCol = await this.getColumnName(queryRunner, 'portfolios', [
      'organization_id',
      'organizationId',
    ]);
    const createdByCol = await this.getColumnName(queryRunner, 'portfolios', [
      'created_by_id',
      'createdById',
    ]);

    if (!orgCol) {
      throw new Error(
        'Migration failed: Could not find organization column in portfolios table',
      );
    }

    const orphanedPortfolios = await queryRunner.query(`
      SELECT id, "${orgCol}" as organization_id, ${createdByCol ? `"${createdByCol}" as created_by_id` : 'NULL as created_by_id'}
      FROM portfolios
      WHERE workspace_id IS NULL
    `);

    console.log(
      `[Phase6Migration] Found ${orphanedPortfolios.length} orphaned portfolios`,
    );

    for (const portfolio of orphanedPortfolios) {
      let workspaceId: string | null = null;

      // Try to find creator's default workspace
      if (portfolio.created_by_id) {
        const creatorWorkspace = await queryRunner.query(
          `
          SELECT w.id
          FROM workspaces w
          INNER JOIN workspace_members wm ON w.id = wm.workspace_id
          WHERE wm.user_id = $1
          AND w.organization_id = $2
          AND wm.role = 'workspace_owner'
          ORDER BY w.created_at ASC
          LIMIT 1
        `,
          [portfolio.created_by_id, portfolio.organization_id],
        );

        if (creatorWorkspace.length > 0) {
          workspaceId = creatorWorkspace[0].id;
        }
      }

      // Fallback: oldest workspace in org
      if (!workspaceId) {
        const oldestWorkspace = await queryRunner.query(
          `
          SELECT id
          FROM workspaces
          WHERE organization_id = $1
          AND deleted_at IS NULL
          ORDER BY created_at ASC
          LIMIT 1
        `,
          [portfolio.organization_id],
        );

        if (oldestWorkspace.length > 0) {
          workspaceId = oldestWorkspace[0].id;
        }
      }

      if (workspaceId) {
        await queryRunner.query(
          `UPDATE portfolios SET workspace_id = $1 WHERE id = $2`,
          [workspaceId, portfolio.id],
        );
        console.log(
          `[Phase6Migration] Assigned orphaned portfolio ${portfolio.id} to workspace ${workspaceId}`,
        );
      } else {
        // No workspace found - archive it
        await queryRunner.query(
          `UPDATE portfolios SET status = 'archived' WHERE id = $1`,
          [portfolio.id],
        );
        console.warn(
          `[Phase6Migration] ⚠️  Could not assign portfolio ${portfolio.id} - archived`,
        );
      }
    }
  }

  /**
   * Handle programs with no linked projects
   */
  private async handleOrphanedPrograms(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Detect column names
    const orgCol = await this.getColumnName(queryRunner, 'programs', [
      'organization_id',
      'organizationId',
    ]);

    if (!orgCol) {
      throw new Error(
        'Migration failed: Could not find organization column in programs table',
      );
    }

    const orphanedPrograms = await queryRunner.query(`
      SELECT id, "${orgCol}" as organization_id, portfolio_id
      FROM programs
      WHERE workspace_id IS NULL
    `);

    console.log(
      `[Phase6Migration] Found ${orphanedPrograms.length} orphaned programs`,
    );

    for (const program of orphanedPrograms) {
      // Get workspace from portfolio
      const portfolio = await queryRunner.query(
        `SELECT workspace_id FROM portfolios WHERE id = $1`,
        [program.portfolio_id],
      );

      if (portfolio.length > 0 && portfolio[0].workspace_id) {
        await queryRunner.query(
          `UPDATE programs SET workspace_id = $1 WHERE id = $2`,
          [portfolio[0].workspace_id, program.id],
        );
        console.log(
          `[Phase6Migration] Assigned orphaned program ${program.id} to workspace ${portfolio[0].workspace_id} from portfolio`,
        );
      } else {
        // Archive if portfolio has no workspace
        await queryRunner.query(
          `UPDATE programs SET status = 'archived' WHERE id = $1`,
          [program.id],
        );
        console.warn(
          `[Phase6Migration] ⚠️  Could not assign program ${program.id} - archived`,
        );
      }
    }
  }

  /**
   * Verify no null workspace_id remain
   */
  private async verifyNoNulls(queryRunner: QueryRunner): Promise<void> {
    const nullPortfolios = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM portfolios
      WHERE workspace_id IS NULL
      AND status != 'archived'
    `);

    const nullPrograms = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM programs
      WHERE workspace_id IS NULL
      AND status != 'archived'
    `);

    const portfolioCount = parseInt(nullPortfolios[0]?.count || '0', 10);
    const programCount = parseInt(nullPrograms[0]?.count || '0', 10);

    if (portfolioCount > 0 || programCount > 0) {
      throw new Error(
        `[Phase6Migration] Verification failed: ${portfolioCount} portfolios and ${programCount} programs still have null workspace_id`,
      );
    }

    console.log(
      `[Phase6Migration] ✅ Verification passed: All portfolios and programs have workspace_id`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove NOT NULL constraints
    await queryRunner.query(`
      ALTER TABLE portfolios
      ALTER COLUMN workspace_id DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE programs
      ALTER COLUMN workspace_id DROP NOT NULL
    `);

    // Drop indexes
    await queryRunner.dropIndex('portfolios', 'idx_portfolio_org_workspace');
    await queryRunner.dropIndex('programs', 'idx_program_org_workspace');
    await queryRunner.dropIndex(
      'programs',
      'idx_program_org_workspace_portfolio',
    );

    // Note: We cannot safely remove workspace_id columns as we don't know original state
    // This migration is effectively one-way for data safety
    console.warn(
      `[Phase6Migration] Down migration: Removed constraints and indexes. workspace_id columns remain for data safety.`,
    );
  }
}
