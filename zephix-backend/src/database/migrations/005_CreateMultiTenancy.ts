import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMultiTenancy1700000000005 implements MigrationInterface {
  name = 'CreateMultiTenancy1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Organizations table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "settings" jsonb NOT NULL DEFAULT '{}',
        "status" character varying NOT NULL DEFAULT 'active',
        "trialEndsAt" date,
        "description" text,
        "website" character varying(255),
        "industry" character varying(100),
        "size" character varying(50),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_organization_status" CHECK ("status" IN ('active', 'suspended', 'trial')),
        CONSTRAINT "CHK_organization_size" CHECK ("size" IN ('startup', 'small', 'medium', 'large', 'enterprise'))
      )
    `);

    // Create indexes for organizations (handle existing indexes gracefully)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ORGANIZATION_SLUG" ON "organizations" ("slug")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ORGANIZATION_STATUS" ON "organizations" ("status")`);

    // Create UserOrganizations junction table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "role" character varying NOT NULL DEFAULT 'viewer',
        "isActive" boolean NOT NULL DEFAULT true,
        "permissions" jsonb NOT NULL DEFAULT '{}',
        "joinedAt" date,
        "lastAccessAt" date,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_user_org_role" CHECK ("role" IN ('owner', 'admin', 'pm', 'viewer'))
      )
    `);

    // Create indexes for user_organizations (handle existing indexes gracefully)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USER_ORG_USER_ID" ON "user_organizations" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USER_ORG_ORG_ID" ON "user_organizations" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USER_ORG_ACTIVE" ON "user_organizations" ("isActive")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USER_ORG_ROLE" ON "user_organizations" ("role")`);

    // Add foreign key constraints (handle existing constraints gracefully)
    await queryRunner.query(`
      ALTER TABLE "user_organizations" 
      ADD CONSTRAINT IF NOT EXISTS "FK_user_organizations_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_organizations" 
      ADD CONSTRAINT IF NOT EXISTS "FK_user_organizations_organizationId" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    // Add organizationId column to existing tenant entities
    const tenantTables = [
      'projects',
      'teams', 
      'team_members',
      'portfolios',
      'programs',
      'user_projects',
      'status_reports',
      'project_metrics',
      'performance_baselines',
      'alert_configurations',
      'manual_updates',
      'stakeholder_communications',
      'risks',
      'risk_assessments',
      'risk_responses',
      'risk_monitoring',
      'pm_knowledge_chunks'
    ];

    for (const table of tenantTables) {
      // Check if table exists before adding column
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}'
        )
      `);

      if (tableExists[0].exists) {
        // Check if organizationId column already exists
        const columnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}' 
            AND column_name = 'organizationId'
          )
        `);

        if (!columnExists[0].exists) {
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD COLUMN "organizationId" uuid
          `);

          // Create index on organizationId for performance
          await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_${table.toUpperCase()}_ORG_ID" 
            ON "${table}" ("organizationId")
          `);
        }
      }
    }

    // Handle BRD tables specifically - they need tenant_id to organizationId migration
    const brdTables = ['brds', 'brd_analyses', 'generated_project_plans'];
    
    for (const table of brdTables) {
      // Check if table exists
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}'
        )
      `);

      if (tableExists[0].exists) {
        // Check if table has tenant_id column (old schema)
        const hasTenantId = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}' 
            AND column_name = 'tenant_id'
          )
        `);

        // Check if table has organizationId column (new schema)
        const hasOrganizationId = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}' 
            AND column_name = 'organizationId'
          )
        `);

        if (hasTenantId[0].exists && !hasOrganizationId[0].exists) {
          // Migrate from tenant_id to organizationId
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD COLUMN "organizationId" uuid
          `);

          // Copy data from tenant_id to organizationId
          await queryRunner.query(`
            UPDATE "${table}" 
            SET "organizationId" = "tenant_id"
          `);

          // Make organizationId NOT NULL after data copy
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ALTER COLUMN "organizationId" SET NOT NULL
          `);

          // Drop the old tenant_id column
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            DROP COLUMN "tenant_id"
          `);

          // Create index on organizationId for performance
          await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_${table.toUpperCase()}_ORG_ID" 
            ON "${table}" ("organizationId")
          `);

          // Add foreign key constraint for organizationId
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD CONSTRAINT IF NOT EXISTS "FK_${table}_organizationId" 
            FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
          `);
        } else if (!hasOrganizationId[0].exists) {
          // Table exists but has neither column - add organizationId
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD COLUMN "organizationId" uuid
          `);

          // Create index on organizationId for performance
          await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_${table.toUpperCase()}_ORG_ID" 
            ON "${table}" ("organizationId")
          `);

          // Add foreign key constraint for organizationId
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD CONSTRAINT IF NOT EXISTS "FK_${table}_organizationId" 
            FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
          `);
        }
      }
    }

    // Add organizationId to users table if it doesn't exist
    const usersColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'organizationId'
      )
    `);

    if (!usersColumnExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "organizationId" uuid
      `);

      // Create index on organizationId for performance
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_USERS_ORG_ID" 
        ON "users" ("organizationId")
      `);
    }

    // Add foreign key constraint for users.organizationId if it doesn't exist
    const usersFkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND constraint_name = 'FK_users_organizationId'
      )
    `);

    if (!usersFkExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD CONSTRAINT "FK_users_organizationId" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_organizationId"`);
    await queryRunner.query(`ALTER TABLE "user_organizations" DROP CONSTRAINT IF EXISTS "FK_user_organizations_organizationId"`);
    await queryRunner.query(`ALTER TABLE "user_organizations" DROP CONSTRAINT IF EXISTS "FK_user_organizations_userId"`);

    // Drop BRD table foreign key constraints
    const brdTables = ['brds', 'brd_analyses', 'generated_project_plans'];
    for (const table of brdTables) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_organizationId"`);
    }

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USERS_ORG_ID"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "user_organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);

    // Remove organizationId columns from tenant tables
    const tenantTables = [
      'projects',
      'teams', 
      'team_members',
      'portfolios',
      'programs',
      'user_projects',
      'status_reports',
      'project_metrics',
      'performance_baselines',
      'alert_configurations',
      'manual_updates',
      'stakeholder_communications',
      'risks',
      'risk_assessments',
      'risk_responses',
      'risk_monitoring',
      'pm_knowledge_chunks'
    ];

    for (const table of tenantTables) {
      // Check if table exists before removing column
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}'
        )
      `);

      if (tableExists[0].exists) {
        // Check if organizationId column exists
        const columnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}' 
            AND column_name = 'organizationId'
          )
        `);

        if (columnExists[0].exists) {
          // Drop index first
          await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table.toUpperCase()}_ORG_ID"`);
          
          // Remove column
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            DROP COLUMN "organizationId"
          `);
        }
      }
    }

    // Handle BRD tables rollback - restore tenant_id column
    for (const table of brdTables) {
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}'
        )
      `);

      if (tableExists[0].exists) {
        const hasOrganizationId = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}' 
            AND column_name = 'organizationId'
          )
        `);

        if (hasOrganizationId[0].exists) {
          // Drop index and constraint first
          await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table.toUpperCase()}_ORG_ID"`);
          await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_organizationId"`);

          // Add back tenant_id column
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD COLUMN "tenant_id" uuid
          `);

          // Copy data back from organizationId to tenant_id
          await queryRunner.query(`
            UPDATE "${table}" 
            SET "tenant_id" = "organizationId"
          `);

          // Make tenant_id NOT NULL
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ALTER COLUMN "tenant_id" SET NOT NULL
          `);

          // Drop organizationId column
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            DROP COLUMN "organizationId"
          `);
        }
      }
    }

    // Remove organizationId from users table
    const usersColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'organizationId'
      )
    `);

    if (usersColumnExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        DROP COLUMN "organizationId"
      `);
    }
  }
}
