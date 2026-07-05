import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// Migration 18000000000191 — AddCapabilitiesToProjectsAndTemplates
//
// Adds a JSONB `capabilities` column to `projects` and `templates`.
// Fixed vocabulary: use_phases (bool), use_iterations (bool),
//                   use_gates (bool), use_wip_limits (bool).
// Absent keys → code layer applies defaults:
//   use_phases=true, use_iterations=false, use_gates=true, use_wip_limits=false
// (waterfall-shaped defaults preserve existing behaviour for all current rows
//  except agile-family rows which are backfilled below.)
//
// Relationship to existing flat governance columns (waterfall_enabled,
// baselines_enabled, earned_value_enabled, capacity_enabled):
//   Those columns gate PM-engine subsystems (CPM, EV, baseline snapshots,
//   capacity scoring). They are separate concerns and are NOT superseded
//   by this column.
//
// GIN index: omitted. Track C access pattern is always point-lookup by
//   project_id — no containment queries (@>, ?) expected. Defer GIN if
//   analytics queries require it.
// ─────────────────────────────────────────────────────────────────────────────

export class AddCapabilitiesToProjectsAndTemplates18000000000191
  implements MigrationInterface
{
  name = 'AddCapabilitiesToProjectsAndTemplates18000000000191';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add capabilities JSONB to projects
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'
    `);

    // 2. Add capabilities JSONB to templates
    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'
    `);

    // 3. Backfill use_iterations:true for agile-family PROJECTS.
    //    Methodology default is 'agile' (varchar, lower-case convention).
    //    Agile-family: 'scrum', 'agile', 'kanban', 'hybrid'.
    //    Waterfall projects keep capabilities={} — absent-key code defaults to iterations=false.
    //    || operator (merge) is idempotent: never clobbers other keys.
    await queryRunner.query(`
      UPDATE projects
        SET capabilities = capabilities || jsonb_build_object('use_iterations', true)
        WHERE methodology IN ('scrum', 'agile', 'kanban', 'hybrid')
    `);

    // 4. Backfill use_iterations:true for agile-family TEMPLATES.
    //    templates.methodology: lower-case ('scrum','agile','kanban','hybrid').
    //    templates.delivery_method: upper-case text ('SCRUM','KANBAN','HYBRID').
    //    Either field being agile-family qualifies the row.
    //    NULL on both fields → no backfill → {} → code default iterations=false.
    await queryRunner.query(`
      UPDATE templates
        SET capabilities = capabilities || jsonb_build_object('use_iterations', true)
        WHERE methodology IN ('scrum', 'agile', 'kanban', 'hybrid')
           OR delivery_method IN ('SCRUM', 'KANBAN', 'HYBRID')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE projects DROP COLUMN IF EXISTS capabilities`,
    );
    await queryRunner.query(
      `ALTER TABLE templates DROP COLUMN IF EXISTS capabilities`,
    );
  }
}
