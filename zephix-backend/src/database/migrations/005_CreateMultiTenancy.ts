import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMultiTenancy1700000000005 implements MigrationInterface {
  name = 'CreateMultiTenancy1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Organizations table
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

    // Create indexes for organizations
    await queryRunner.query(`CREATE INDEX "IDX_ORGANIZATION_SLUG" ON "organizations" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_ORGANIZATION_STATUS" ON "organizations" ("status")`);

    // Create UserOrganizations junction table
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

    // Create indexes for user_organizations
    await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_USER_ID" ON "user_organizations" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_ORG_ID" ON "user_organizations" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_ACTIVE" ON "user_organizations" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_USER_ORG_ROLE" ON "user_organizations" ("role")`);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "user_organizations" 
      ADD CONSTRAINT "FK_user_organizations_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_organizations" 
      ADD CONSTRAINT "FK_user_organizations_organizationId" 
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
        await queryRunner.query(`
          ALTER TABLE "${table}" 
          ADD COLUMN "organizationId" uuid
        `);

        // Create index for organizationId
        await queryRunner.query(`
          CREATE INDEX "IDX_${table}_organizationId" ON "${table}" ("organizationId")
        `);

        // Add foreign key constraint
        await queryRunner.query(`
          ALTER TABLE "${table}" 
          ADD CONSTRAINT "FK_${table}_organizationId" 
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
        `);
      }
    }

    // Update BRDs table if it exists (rename tenant_id to organizationId for consistency)
    const brdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'brds'
      )
    `);

    if (brdExists[0].exists) {
      // Check if tenant_id exists
      const tenantIdExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'brds' AND column_name = 'tenant_id'
        )
      `);

      if (tenantIdExists[0].exists) {
        await queryRunner.query(`ALTER TABLE "brds" RENAME COLUMN "tenant_id" TO "organizationId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brds_tenant_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brds_tenant_id_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brds_tenant_id_project_id"`);
        
        await queryRunner.query(`CREATE INDEX "IDX_brds_organizationId" ON "brds" ("organizationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_brds_organizationId_status" ON "brds" ("organizationId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_brds_organizationId_project_id" ON "brds" ("organizationId", "project_id")`);
        
        await queryRunner.query(`
          ALTER TABLE "brds" 
          ADD CONSTRAINT "FK_brds_organizationId" 
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}'
        )
      `);

      if (tableExists[0].exists) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_organizationId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_organizationId"`);
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "organizationId"`);
      }
    }

    // Revert BRDs table changes
    const brdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'brds'
      )
    `);

    if (brdExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "brds" DROP CONSTRAINT IF EXISTS "FK_brds_organizationId"`);
      await queryRunner.query(`ALTER TABLE "brds" RENAME COLUMN "organizationId" TO "tenant_id"`);
    }

    // Drop user_organizations table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_organizations"`);

    // Drop organizations table
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}
