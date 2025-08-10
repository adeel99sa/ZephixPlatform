import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMultiTenancy1700000000005 implements MigrationInterface {
  name = 'CreateMultiTenancy1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Organizations table (handle existing table gracefully)
    const orgTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
      )
    `);

    if (!orgTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "organizations" (
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
    }

    // Create indexes for organizations (handle existing indexes gracefully)
    const orgSlugIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_ORGANIZATION_SLUG'
      )
    `);
    if (!orgSlugIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_ORGANIZATION_SLUG" ON "organizations" ("slug")`);
    }

    const orgStatusIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_ORGANIZATION_STATUS'
      )
    `);
    if (!orgStatusIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_ORGANIZATION_STATUS" ON "organizations" ("status")`);
    }

    // Create Users table (handle existing table gracefully)
    const usersTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);

    if (!usersTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "email" character varying(255) NOT NULL,
          "password" character varying(255) NOT NULL,
          "firstName" character varying(255) NOT NULL,
          "lastName" character varying(255) NOT NULL,
          "isActive" boolean NOT NULL DEFAULT true,
          "isEmailVerified" boolean NOT NULL DEFAULT false,
          "emailVerifiedAt" timestamp,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_users" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_users_email" UNIQUE ("email")
        )
      `);
    }

    // Create indexes for users (handle existing indexes gracefully)
    const usersEmailIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USERS_EMAIL'
      )
    `);
    if (!usersEmailIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_USERS_EMAIL" ON "users" ("email")`);
    }

    const usersActiveIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USERS_ACTIVE'
      )
    `);
    if (!usersActiveIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_USERS_ACTIVE" ON "users" ("isActive")`);
    }

    // Create UserOrganizations junction table (handle existing table gracefully)
    const userOrgTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_organizations'
      )
    `);

    if (!userOrgTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "user_organizations" (
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
    }

    // Create indexes for user_organizations (handle existing indexes gracefully)
    const userOrgUserIdIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USER_ORG_USER_ID'
      )
    `);
    if (!userOrgUserIdIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_USER_ID" ON "user_organizations" ("userId")`);
    }

    const userOrgOrgIdIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USER_ORG_ORG_ID'
      )
    `);
    if (!userOrgOrgIdIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_ORG_ID" ON "user_organizations" ("organizationId")`);
    }

    const userOrgActiveIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USER_ORG_ACTIVE'
      )
    `);
    if (!userOrgActiveIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_ACTIVE" ON "user_organizations" ("isActive")`);
    }

    const userOrgRoleIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USER_ORG_ROLE'
      )
    `);
    if (!userOrgRoleIndexExists[0].exists) {
      await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_ROLE" ON "user_organizations" ("role")`);
    }

    // Add foreign key constraints (handle existing constraints gracefully)
    const userOrgUserIdFkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'user_organizations' 
        AND constraint_name = 'FK_user_organizations_userId'
      )
    `);

    if (!userOrgUserIdFkExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "user_organizations" 
        ADD CONSTRAINT "FK_user_organizations_userId" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    }

    const userOrgOrgIdFkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'user_organizations' 
        AND constraint_name = 'FK_user_organizations_organizationId'
      )
    `);

    if (!userOrgOrgIdFkExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "user_organizations" 
        ADD CONSTRAINT "FK_user_organizations_organizationId" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
    }

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
      'risk_monitoring'
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
          const indexName = `IDX_${table.toUpperCase()}_ORG_ID`;
          const indexExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE indexname = '${indexName}'
            )
          `);
          if (!indexExists[0].exists) {
            await queryRunner.query(`
              CREATE INDEX "${indexName}" 
              ON "${table}" ("organizationId")
            `);
          }
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
          const indexName = `IDX_${table.toUpperCase()}_ORG_ID`;
          const indexExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE indexname = '${indexName}'
            )
          `);
          if (!indexExists[0].exists) {
            await queryRunner.query(`
              CREATE INDEX "${indexName}" 
              ON "${table}" ("organizationId")
            `);
          }

          // Add foreign key constraint for organizationId
          const brdTableFkExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.table_constraints 
              WHERE table_schema = 'public' 
              AND table_name = '${table}' 
              AND constraint_name = 'FK_${table}_organizationId'
            )
          `);

          if (!brdTableFkExists[0].exists) {
            await queryRunner.query(`
              ALTER TABLE "${table}" 
              ADD CONSTRAINT "FK_${table}_organizationId" 
              FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
            `);
          }
        } else if (!hasOrganizationId[0].exists) {
          // Table exists but has neither column - add organizationId
          await queryRunner.query(`
            ALTER TABLE "${table}" 
            ADD COLUMN "organizationId" uuid
          `);

          // Create index on organizationId for performance
          const indexName = `IDX_${table.toUpperCase()}_ORG_ID`;
          const indexExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE indexname = '${indexName}'
            )
          `);
          if (!indexExists[0].exists) {
            await queryRunner.query(`
              CREATE INDEX "${indexName}" 
              ON "${table}" ("organizationId")
            `);
          }

          // Add foreign key constraint for organizationId
          const brdTableFkExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.table_constraints 
              WHERE table_schema = 'public' 
              AND table_name = '${table}' 
              AND constraint_name = 'FK_${table}_organizationId'
            )
          `);

          if (!brdTableFkExists[0].exists) {
            await queryRunner.query(`
              ALTER TABLE "${table}" 
              ADD CONSTRAINT "FK_${table}_organizationId" 
              FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
            `);
          }
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
      const usersIndexExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = 'IDX_USERS_ORG_ID'
        )
      `);
      if (!usersIndexExists[0].exists) {
        await queryRunner.query(`
          CREATE INDEX "IDX_USERS_ORG_ID" 
          ON "users" ("organizationId")
        `);
      }
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
    const usersFkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND constraint_name = 'FK_users_organizationId'
      )
    `);
    if (usersFkExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_organizationId"`);
    }

    const userOrgOrgIdFkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'user_organizations' 
        AND constraint_name = 'FK_user_organizations_organizationId'
      )
    `);
    if (userOrgOrgIdFkExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_user_organizations_organizationId"`);
    }

    const userOrgUserIdFkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'user_organizations' 
        AND constraint_name = 'FK_user_organizations_userId'
      )
    `);
    if (userOrgUserIdFkExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_user_organizations_userId"`);
    }

    // Drop BRD table foreign key constraints
    const brdTables = ['brds', 'brd_analyses', 'generated_project_plans'];
    for (const table of brdTables) {
      const brdTableFkExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = '${table}' 
          AND constraint_name = 'FK_${table}_organizationId'
        )
      `);
      if (brdTableFkExists[0].exists) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_organizationId"`);
      }
    }

    // Drop indexes
    const usersIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = 'IDX_USERS_ORG_ID'
      )
    `);
    if (usersIndexExists[0].exists) {
      await queryRunner.query(`DROP INDEX "IDX_USERS_ORG_ID"`);
    }

    // Drop tables
    const userOrgTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_organizations'
      )
    `);
    if (userOrgTableExists[0].exists) {
      await queryRunner.query(`DROP TABLE "user_organizations"`);
    }

    const orgTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
      )
    `);
    if (orgTableExists[0].exists) {
      await queryRunner.query(`DROP TABLE "organizations"`);
    }

    const usersTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);
    if (usersTableExists[0].exists) {
      await queryRunner.query(`DROP TABLE "users"`);
    }

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
      'risk_monitoring'
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
          const indexName = `IDX_${table.toUpperCase()}_ORG_ID`;
          const indexExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE indexname = '${indexName}'
            )
          `);
          if (indexExists[0].exists) {
            await queryRunner.query(`DROP INDEX "${indexName}"`);
          }
          
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
          const indexName = `IDX_${table.toUpperCase()}_ORG_ID`;
          const indexExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE indexname = '${indexName}'
            )
          `);
          if (indexExists[0].exists) {
            await queryRunner.query(`DROP INDEX "${indexName}"`);
          }
          
          const brdTableFkExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.table_constraints 
              WHERE table_schema = 'public' 
              AND table_name = '${table}' 
              AND constraint_name = 'FK_${table}_organizationId'
            )
          `);
          if (brdTableFkExists[0].exists) {
            await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_organizationId"`);
          }

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
