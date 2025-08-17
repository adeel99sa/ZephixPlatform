import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowFramework1704123600000
  implements MigrationInterface
{
  name = 'CreateWorkflowFramework1704123600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create workflow_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "type" character varying NOT NULL DEFAULT 'custom',
        "configuration" jsonb NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "isDefault" boolean NOT NULL DEFAULT false,
        "isPublic" boolean NOT NULL DEFAULT false,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_templates" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_workflow_template_type" CHECK ("type" IN ('intake', 'project', 'orr', 'custom'))
      )
    `);

    // Create workflow_instances table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "templateId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'active',
        "currentStage" character varying,
        "data" jsonb NOT NULL DEFAULT '{}',
        "stageHistory" jsonb NOT NULL DEFAULT '[]',
        "approvals" jsonb NOT NULL DEFAULT '[]',
        "assignedTo" uuid,
        "createdBy" uuid NOT NULL,
        "dueDate" date,
        "priority" character varying NOT NULL DEFAULT 'medium',
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_instances" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_workflow_instance_status" CHECK ("status" IN ('active', 'completed', 'cancelled', 'on_hold', 'failed')),
        CONSTRAINT "CHK_workflow_instance_priority" CHECK ("priority" IN ('low', 'medium', 'high', 'critical'))
      )
    `);

    // Create intake_forms table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intake_forms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "thankYouMessage" text,
        "formSchema" jsonb NOT NULL,
        "targetWorkflowId" uuid,
        "isPublic" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true,
        "settings" jsonb NOT NULL DEFAULT '{}',
        "analytics" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_intake_forms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_intake_form_slug" UNIQUE ("slug")
      )
    `);

    // Create intake_submissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intake_submissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "formId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "data" jsonb NOT NULL,
        "submitterName" character varying,
        "submitterEmail" character varying,
        "submitterPhone" character varying,
        "submittedBy" uuid,
        "assignedTo" uuid,
        "processedBy" uuid,
        "processedAt" TIMESTAMP,
        "processingNotes" text,
        "workflowInstanceId" uuid,
        "priority" character varying NOT NULL DEFAULT 'medium',
        "tags" jsonb NOT NULL DEFAULT '[]',
        "dueDate" date,
        "automationResults" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_intake_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_intake_submission_status" CHECK ("status" IN ('pending', 'processing', 'processed', 'rejected', 'cancelled')),
        CONSTRAINT "CHK_intake_submission_priority" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'))
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_template_organization" ON "workflow_templates" ("organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_template_type" ON "workflow_templates" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_template_active" ON "workflow_templates" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_template_default" ON "workflow_templates" ("isDefault")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_instance_organization" ON "workflow_instances" ("organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_instance_template" ON "workflow_instances" ("templateId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_instance_status" ON "workflow_instances" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_instance_assigned" ON "workflow_instances" ("assignedTo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_instance_created_by" ON "workflow_instances" ("createdBy")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_instance_created_at" ON "workflow_instances" ("createdAt")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_form_organization" ON "intake_forms" ("organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_form_slug" ON "intake_forms" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_form_active" ON "intake_forms" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_form_public" ON "intake_forms" ("isPublic")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_submission_organization" ON "intake_submissions" ("organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_submission_form" ON "intake_submissions" ("formId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_submission_status" ON "intake_submissions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_submission_assigned" ON "intake_submissions" ("assignedTo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_submission_workflow" ON "intake_submissions" ("workflowInstanceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_intake_submission_created_at" ON "intake_submissions" ("createdAt")`,
    );

    // Add foreign key constraints safely
    await this.addConstraintIfNotExists(
      queryRunner,
      'workflow_templates',
      'FK_workflow_template_organization',
      `FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_organization',
      `FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_template',
      `FOREIGN KEY ("templateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_assigned_user',
      `FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_creator',
      `FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_forms',
      'FK_intake_form_organization',
      `FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_forms',
      'FK_intake_form_workflow',
      `FOREIGN KEY ("targetWorkflowId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_organization',
      `FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_form',
      `FOREIGN KEY ("formId") REFERENCES "intake_forms"("id") ON DELETE CASCADE`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_submitter',
      `FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_assigned_user',
      `FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_processor',
      `FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await this.addConstraintIfNotExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_workflow',
      `FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL`,
    );
  }

  // Helper method to safely add constraints
  private async addConstraintIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    constraintDefinition: string,
  ): Promise<void> {
    try {
      // Check if constraint already exists
      const constraintExists = await queryRunner.query(
        `
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = $1 AND table_name = $2
      `,
        [constraintName, tableName],
      );

      if (constraintExists.length === 0) {
        // Add constraint only if it doesn't exist
        await queryRunner.query(`
          ALTER TABLE "${tableName}" 
          ADD CONSTRAINT "${constraintName}" 
          ${constraintDefinition}
        `);
      }
    } catch (error) {
      // Log constraint addition error but don't fail the migration
      console.warn(
        `Warning: Could not add constraint ${constraintName} to ${tableName}:`,
        error.message,
      );
    }
  }

  // Helper method to safely drop constraints
  private async dropConstraintIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    try {
      // Check if constraint exists before dropping
      const constraintExists = await queryRunner.query(
        `
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = $1 AND table_name = $2
      `,
        [constraintName, tableName],
      );

      if (constraintExists.length > 0) {
        // Drop constraint only if it exists
        await queryRunner.query(`
          ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"
        `);
      }
    } catch (error) {
      // Log constraint drop error but don't fail the migration
      console.warn(
        `Warning: Could not drop constraint ${constraintName} from ${tableName}:`,
        error.message,
      );
    }
  }

  // Helper method to safely drop indexes
  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    indexName: string,
  ): Promise<void> {
    try {
      // Check if index exists before dropping
      const indexExists = await queryRunner.query(
        `
        SELECT 1 FROM pg_indexes WHERE indexname = $1
      `,
        [indexName],
      );

      if (indexExists.length > 0) {
        // Drop index only if it exists
        await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}"`);
      }
    } catch (error) {
      // Log index drop error but don't fail the migration
      console.warn(
        `Warning: Could not drop index ${indexName}:`,
        error.message,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints safely
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_workflow',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_processor',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_assigned_user',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_submitter',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_form',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_submissions',
      'FK_intake_submission_organization',
    );

    await this.dropConstraintIfExists(
      queryRunner,
      'intake_forms',
      'FK_intake_form_workflow',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'intake_forms',
      'FK_intake_form_organization',
    );

    await this.dropConstraintIfExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_creator',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_assigned_user',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_template',
    );
    await this.dropConstraintIfExists(
      queryRunner,
      'workflow_instances',
      'FK_workflow_instance_organization',
    );

    await this.dropConstraintIfExists(
      queryRunner,
      'workflow_templates',
      'FK_workflow_template_organization',
    );

    // Drop indexes safely
    await this.dropIndexIfExists(
      queryRunner,
      'IDX_intake_submission_created_at',
    );
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_submission_workflow');
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_submission_assigned');
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_submission_status');
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_submission_form');
    await this.dropIndexIfExists(
      queryRunner,
      'IDX_intake_submission_organization',
    );

    await this.dropIndexIfExists(queryRunner, 'IDX_intake_form_public');
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_form_active');
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_form_slug');
    await this.dropIndexIfExists(queryRunner, 'IDX_intake_form_organization');

    await this.dropIndexIfExists(
      queryRunner,
      'IDX_workflow_instance_created_at',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'IDX_workflow_instance_created_by',
    );
    await this.dropIndexIfExists(queryRunner, 'IDX_workflow_instance_assigned');
    await this.dropIndexIfExists(queryRunner, 'IDX_workflow_instance_status');
    await this.dropIndexIfExists(queryRunner, 'IDX_workflow_instance_template');
    await this.dropIndexIfExists(
      queryRunner,
      'IDX_workflow_instance_organization',
    );

    await this.dropIndexIfExists(queryRunner, 'IDX_workflow_template_default');
    await this.dropIndexIfExists(queryRunner, 'IDX_workflow_template_active');
    await this.dropIndexIfExists(queryRunner, 'IDX_workflow_template_type');
    await this.dropIndexIfExists(
      queryRunner,
      'IDX_workflow_template_organization',
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "intake_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "intake_forms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_instances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_templates"`);
  }
}
