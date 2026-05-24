import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 5.1 hotfix — extend CHK_audit_events_entity_type to include
 * `project_artifact` and `project_artifact_item`.
 *
 * Sprint 5.1 added these values to the TypeScript `AuditEntityType` enum
 * but missed the matching DB constraint extension. Result: every E9 audit
 * emit from `ProjectArtifactsService` / `ProjectArtifactItemsService`
 * fails the CHECK constraint (SQLSTATE 23514), is caught by the
 * service-level try/catch, and persisted only as a `logger.warn`. The
 * post-merge gate (Step 4 — audit event verification) caught this on
 * PR #307 and triggered the protocol's STOP-and-patch path.
 *
 * Pattern mirrors migration 18000000000083 — drop + recreate constraint
 * with full prior allow-list preserved + new values appended. Defensive
 * additions (idempotency check + post-up verification log) match the
 * defensive style locked by Sprint 5.1 feedback (see
 * `feedback_migration_column_audit.md`).
 */
export class ExtendAuditEntityTypesForArtifacts18000000000183
  implements MigrationInterface
{
  name = 'ExtendAuditEntityTypesForArtifacts18000000000183';

  private readonly entityTypeConstraintName = 'CHK_audit_events_entity_type';

  /**
   * Full allow-list: 37 prior values (last extended by migration 083) +
   * 2 new Sprint 5.1 values.
   */
  private readonly allEntityTypes = [
    // Lowercase entity types (Phase 3B)
    'organization', 'workspace', 'project', 'portfolio',
    'work_task', 'work_risk', 'doc', 'attachment',
    'scenario_plan', 'scenario_action', 'scenario_result',
    'baseline', 'capacity_calendar', 'billing_plan',
    'entitlement', 'webhook', 'board_move',
    // UPPERCASE entity types (work-management module)
    'PHASE', 'TASK', 'SPRINT', 'RISK', 'ALLOCATION',
    'CHANGE_REQUEST', 'DOCUMENT', 'BUDGET', 'GATE', 'POLICY',
    'TEMPLATE', 'TEMPLATE_ACTIVATION', 'TAILORING_PROFILE',
    // Auth/lifecycle entity types
    'user', 'email_verification', 'password_reset',
    'authorization_decision',
    // Template Center entity types (migration 083)
    'TEMPLATE_LINEAGE', 'GATE_APPROVAL', 'DOCUMENT_INSTANCE',
    // === NEW: 2 Sprint 5.1 artifact entity types ===
    'project_artifact', 'project_artifact_item',
  ];

  private readonly priorEntityTypes = this.allEntityTypes.filter(
    (v) => !['project_artifact', 'project_artifact_item'].includes(v),
  );

  private buildConstraintSql(values: string[]): string {
    const quoted = values.map((v) => `'${v}'`).join(', ');
    return `ALTER TABLE audit_events ADD CONSTRAINT "${this.entityTypeConstraintName}" CHECK (entity_type IN (${quoted}))`;
  }

  private async readConstraintDef(
    queryRunner: QueryRunner,
  ): Promise<string> {
    const result = (await queryRunner.query(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = '${this.entityTypeConstraintName}'`,
    )) as Array<{ def: string }>;
    return result?.[0]?.def ?? '';
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotency: if both new values are already in the constraint, skip.
    // Matches the defensive `hasTable` guard pattern used in migration 181.
    const currentDef = await this.readConstraintDef(queryRunner);
    if (
      currentDef.includes("'project_artifact'") &&
      currentDef.includes("'project_artifact_item'")
    ) {
      console.log(
        '[migration-183] Already extended — skipping (idempotent no-op).',
      );
      return;
    }

    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityTypeConstraintName}"`,
    );
    await queryRunner.query(this.buildConstraintSql(this.allEntityTypes));

    // Post-up verification: log the resulting constraint definition so deploy
    // logs show the actual state. Trivial cost, useful post-mortem aid.
    const verifyDef = await this.readConstraintDef(queryRunner);
    console.log(
      `[migration-183] Post-up constraint: ${verifyDef || '(not found)'}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "${this.entityTypeConstraintName}"`,
    );
    await queryRunner.query(this.buildConstraintSql(this.priorEntityTypes));
  }
}
