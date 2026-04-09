/**
 * Phase 4.6 (Template Center cleanup):
 * Shared, strongly-typed contract for the metadata payload that
 * `saveProjectAsTemplate` writes into `templates.metadata` and that
 * `instantiate-v5_1` reads back when rehydrating a project.
 *
 * The frontend mirrors this shape in
 * `zephix-frontend/src/features/templates/template-origin.ts`.
 *
 * Rules:
 *  - Field names must match exactly across backend and frontend.
 *  - Adding a new optional field on the backend must be reflected in the
 *    frontend mirror in the same commit.
 *  - This object is the *only* place where origin / governance state is
 *    carried on a saved template. No magic-string access elsewhere.
 */
export interface TemplateOriginMetadata {
  /** UUID of the source project this template was saved from. */
  sourceProjectId: string;
  /** Snapshot of the source project's display name at save time. */
  sourceProjectName: string;
  /** ISO timestamp the template was created. */
  savedAt: string;
  /** UUID of the user who saved it. */
  savedByUserId: string;
  /**
   * Phase 4.6: full methodology configuration (governance flags, sprint
   * config, gate-required, estimation type, etc.) from the source project.
   * Stored opaquely as a record because the methodology config schema is
   * managed by the methodology-config-validator and may evolve.
   * Re-applied to the new project on instantiate.
   */
  methodologyConfig?: Record<string, any> | null;
  /**
   * Phase 4.6: source project's active KPI ids at save time.
   * Re-seeded onto the new project on instantiate.
   */
  activeKpiIds?: string[];
}

/** Type guard — accepts loose JSON and narrows safely. */
export function isTemplateOriginMetadata(
  v: unknown,
): v is TemplateOriginMetadata {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.sourceProjectId === 'string' &&
    typeof m.sourceProjectName === 'string' &&
    typeof m.savedAt === 'string' &&
    typeof m.savedByUserId === 'string'
  );
}
