import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowFramework1704123600000 implements MigrationInterface {
  name = 'CreateWorkflowFramework1704123600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create workflow_templates table
    await queryRunner.query(`
      CREATE TABLE "workflow_templates" (
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
      CREATE TABLE "workflow_instances" (
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
      CREATE TABLE "intake_forms" (
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
      CREATE TABLE "intake_submissions" (
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
    await queryRunner.query(`CREATE INDEX "IDX_workflow_template_organization" ON "workflow_templates" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_template_type" ON "workflow_templates" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_template_active" ON "workflow_templates" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_template_default" ON "workflow_templates" ("isDefault")`);

    await queryRunner.query(`CREATE INDEX "IDX_workflow_instance_organization" ON "workflow_instances" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_instance_template" ON "workflow_instances" ("templateId")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_instance_status" ON "workflow_instances" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_instance_assigned" ON "workflow_instances" ("assignedTo")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_instance_created_by" ON "workflow_instances" ("createdBy")`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_instance_created_at" ON "workflow_instances" ("createdAt")`);

    await queryRunner.query(`CREATE INDEX "IDX_intake_form_organization" ON "intake_forms" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_form_slug" ON "intake_forms" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_form_active" ON "intake_forms" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_form_public" ON "intake_forms" ("isPublic")`);

    await queryRunner.query(`CREATE INDEX "IDX_intake_submission_organization" ON "intake_submissions" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_submission_form" ON "intake_submissions" ("formId")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_submission_status" ON "intake_submissions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_submission_assigned" ON "intake_submissions" ("assignedTo")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_submission_workflow" ON "intake_submissions" ("workflowInstanceId")`);
    await queryRunner.query(`CREATE INDEX "IDX_intake_submission_created_at" ON "intake_submissions" ("createdAt")`);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "workflow_templates" 
      ADD CONSTRAINT "FK_workflow_template_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "workflow_instances" 
      ADD CONSTRAINT "FK_workflow_instance_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "workflow_instances" 
      ADD CONSTRAINT "FK_workflow_instance_template" 
      FOREIGN KEY ("templateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "workflow_instances" 
      ADD CONSTRAINT "FK_workflow_instance_assigned_user" 
      FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "workflow_instances" 
      ADD CONSTRAINT "FK_workflow_instance_creator" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_forms" 
      ADD CONSTRAINT "FK_intake_form_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_forms" 
      ADD CONSTRAINT "FK_intake_form_workflow" 
      FOREIGN KEY ("targetWorkflowId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_submissions" 
      ADD CONSTRAINT "FK_intake_submission_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_submissions" 
      ADD CONSTRAINT "FK_intake_submission_form" 
      FOREIGN KEY ("formId") REFERENCES "intake_forms"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_submissions" 
      ADD CONSTRAINT "FK_intake_submission_submitter" 
      FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_submissions" 
      ADD CONSTRAINT "FK_intake_submission_assigned_user" 
      FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_submissions" 
      ADD CONSTRAINT "FK_intake_submission_processor" 
      FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "intake_submissions" 
      ADD CONSTRAINT "FK_intake_submission_workflow" 
      FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE "intake_submissions" DROP CONSTRAINT "FK_intake_submission_workflow"`);
    await queryRunner.query(`ALTER TABLE "intake_submissions" DROP CONSTRAINT "FK_intake_submission_processor"`);
    await queryRunner.query(`ALTER TABLE "intake_submissions" DROP CONSTRAINT "FK_intake_submission_assigned_user"`);
    await queryRunner.query(`ALTER TABLE "intake_submissions" DROP CONSTRAINT "FK_intake_submission_submitter"`);
    await queryRunner.query(`ALTER TABLE "intake_submissions" DROP CONSTRAINT "FK_intake_submission_form"`);
    await queryRunner.query(`ALTER TABLE "intake_submissions" DROP CONSTRAINT "FK_intake_submission_organization"`);

    await queryRunner.query(`ALTER TABLE "intake_forms" DROP CONSTRAINT "FK_intake_form_workflow"`);
    await queryRunner.query(`ALTER TABLE "intake_forms" DROP CONSTRAINT "FK_intake_form_organization"`);

    await queryRunner.query(`ALTER TABLE "workflow_instances" DROP CONSTRAINT "FK_workflow_instance_creator"`);
    await queryRunner.query(`ALTER TABLE "workflow_instances" DROP CONSTRAINT "FK_workflow_instance_assigned_user"`);
    await queryRunner.query(`ALTER TABLE "workflow_instances" DROP CONSTRAINT "FK_workflow_instance_template"`);
    await queryRunner.query(`ALTER TABLE "workflow_instances" DROP CONSTRAINT "FK_workflow_instance_organization"`);

    await queryRunner.query(`ALTER TABLE "workflow_templates" DROP CONSTRAINT "FK_workflow_template_organization"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_intake_submission_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_submission_workflow"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_submission_assigned"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_submission_status"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_submission_form"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_submission_organization"`);

    await queryRunner.query(`DROP INDEX "IDX_intake_form_public"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_form_active"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_form_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_intake_form_organization"`);

    await queryRunner.query(`DROP INDEX "IDX_workflow_instance_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_instance_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_instance_assigned"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_instance_status"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_instance_template"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_instance_organization"`);

    await queryRunner.query(`DROP INDEX "IDX_workflow_template_default"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_template_active"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_template_type"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_template_organization"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "intake_submissions"`);
    await queryRunner.query(`DROP TABLE "intake_forms"`);
    await queryRunner.query(`DROP TABLE "workflow_instances"`);
    await queryRunner.query(`DROP TABLE "workflow_templates"`);
  }
}
