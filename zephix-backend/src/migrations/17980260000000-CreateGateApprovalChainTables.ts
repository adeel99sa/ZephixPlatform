import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 10: Create gate approval chain tables for multi-step approval workflows.
 *
 * Tables:
 * - gate_approval_chains: one chain per gate definition
 * - gate_approval_chain_steps: ordered steps within a chain
 * - gate_approval_decisions: individual decisions per user per step per submission
 *
 * Also creates prerequisite tables if they don't exist:
 * - phase_gate_definitions
 * - phase_gate_submissions
 * - phase_gate_submission_documents
 */
export class CreateGateApprovalChainTables17980260000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── Prerequisite: phase_gate_definitions ───────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS phase_gate_definitions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        project_id UUID NOT NULL,
        phase_id UUID NOT NULL,
        name VARCHAR(120) NOT NULL,
        gate_key VARCHAR(120),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        reviewers_role_policy JSONB,
        required_documents JSONB,
        required_checklist JSONB,
        thresholds JSONB,
        created_by_user_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgd_org ON phase_gate_definitions (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgd_ws ON phase_gate_definitions (workspace_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgd_project ON phase_gate_definitions (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgd_phase ON phase_gate_definitions (phase_id)`);

    // ─── Prerequisite: phase_gate_submissions ───────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS phase_gate_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        project_id UUID NOT NULL,
        phase_id UUID NOT NULL,
        gate_definition_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        submitted_by_user_id UUID,
        submitted_at TIMESTAMP,
        decision_by_user_id UUID,
        decided_at TIMESTAMP,
        decision_note TEXT,
        documents_snapshot JSONB,
        checklist_snapshot JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgs_org ON phase_gate_submissions (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgs_ws ON phase_gate_submissions (workspace_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgs_project ON phase_gate_submissions (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgs_phase ON phase_gate_submissions (phase_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgs_gate_def ON phase_gate_submissions (gate_definition_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgs_status ON phase_gate_submissions (status)`);

    // ─── Prerequisite: phase_gate_submission_documents ──────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS phase_gate_submission_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        document_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pgsd_sub ON phase_gate_submission_documents (submission_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_pgsd_sub_doc ON phase_gate_submission_documents (submission_id, document_id)`);

    // ─── Sprint 10: gate_approval_chains ────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_approval_chains (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        gate_definition_id UUID NOT NULL,
        name VARCHAR(120) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by_user_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gac_org ON gate_approval_chains (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gac_ws ON gate_approval_chains (workspace_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gac_gate_def ON gate_approval_chains (gate_definition_id)`);
    // Unique: one active chain per gate definition (where deleted_at IS NULL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_gac_gate_def_active
        ON gate_approval_chains (gate_definition_id)
        WHERE deleted_at IS NULL
    `);

    // ─── Sprint 10: gate_approval_chain_steps ───────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_approval_chain_steps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        chain_id UUID NOT NULL REFERENCES gate_approval_chains(id) ON DELETE CASCADE,
        step_order SMALLINT NOT NULL,
        name VARCHAR(120) NOT NULL,
        description TEXT,
        required_role VARCHAR(40),
        required_user_id UUID,
        approval_type VARCHAR(10) NOT NULL DEFAULT 'ANY_ONE',
        min_approvals SMALLINT NOT NULL DEFAULT 1,
        auto_approve_after_hours SMALLINT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT chk_step_has_target CHECK (required_role IS NOT NULL OR required_user_id IS NOT NULL)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gacs_org ON gate_approval_chain_steps (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gacs_chain ON gate_approval_chain_steps (chain_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_gacs_order ON gate_approval_chain_steps (chain_id, step_order)`);

    // ─── Sprint 10: gate_approval_decisions ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_approval_decisions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        chain_step_id UUID NOT NULL REFERENCES gate_approval_chain_steps(id) ON DELETE CASCADE,
        decided_by_user_id UUID NOT NULL,
        decision VARCHAR(10) NOT NULL,
        note TEXT,
        decided_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT chk_decision_value CHECK (decision IN ('APPROVED', 'REJECTED', 'ABSTAINED'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gad_org ON gate_approval_decisions (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gad_sub ON gate_approval_decisions (submission_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gad_step ON gate_approval_decisions (chain_step_id)`);
    // One decision per user per step per submission
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_gad_one_per_user
        ON gate_approval_decisions (submission_id, chain_step_id, decided_by_user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Sprint 10 tables (reverse order due to FKs)
    await queryRunner.query(`DROP TABLE IF EXISTS gate_approval_decisions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS gate_approval_chain_steps CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS gate_approval_chains CASCADE`);

    // Drop prerequisite tables (reverse order)
    await queryRunner.query(`DROP TABLE IF EXISTS phase_gate_submission_documents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS phase_gate_submissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS phase_gate_definitions CASCADE`);
  }
}
