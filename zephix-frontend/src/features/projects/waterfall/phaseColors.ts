/**
 * Phase 4 (2026-04-08) — Frontend mirror of pm_waterfall_v2.phaseColors.
 *
 * Mirrors the backend declaration in
 * `zephix-backend/src/modules/templates/data/system-template-definitions.ts`
 * (the `pm_waterfall_v2.phaseColors` field). The two declarations MUST stay
 * in sync. The Phase 1 backend test asserts that every phase in
 * pm_waterfall_v2 has an entry in `phaseColors`; this file matches the same
 * 5 entries by construction.
 *
 * Why a frontend mirror exists rather than fetching from the backend:
 *   - Phase color is referenced on every render of every phase header row.
 *     A network round-trip to fetch the template's color palette per render
 *     would be wasteful.
 *   - The 5-color palette for Waterfall is small and stable.
 *   - When the backend exposes `defaultColumns` / `phaseColors` /
 *     `statusBuckets` via a project-metadata API endpoint (Phase 5+ work),
 *     this constant becomes a fallback default and the runtime palette
 *     comes from the API. The CONSUMER api (`getPhaseColor` below) is
 *     intentionally already function-based so a future fetch-based
 *     implementation does not require call-site changes.
 *
 * Keying: matches the backend `reportingKey` field on each phase, NOT the
 * phase display name. Display names can be renamed by users; reporting
 * keys are stable identifiers per template.
 */

/**
 * Locked Waterfall phase color palette. Keys match `pm_waterfall_v2.phases[].reportingKey`.
 */
export const WATERFALL_PHASE_COLORS: Readonly<Record<string, string>> =
  Object.freeze({
    INIT: '#8b5cf6', // purple — Initiation
    PLAN: '#06b6d4', // teal — Planning
    EXEC: '#10b981', // green — Execution
    MONITOR: '#f59e0b', // amber — Monitoring and Control
    CLOSE: '#ef4444', // red — Closure
  });

/**
 * Default fallback color when a phase has no `reportingKey` or its key is
 * not in the palette. Slate gray — visually neutral, won't be mistaken for
 * a recognized phase identity.
 */
const DEFAULT_PHASE_COLOR = '#94a3b8';

/**
 * Resolve a phase's color by reporting key, with a graceful fallback for
 * phases that lack a key or come from a non-Waterfall template.
 *
 * Mapping by `reportingKey` rather than display name is intentional:
 * customers will eventually rename phases ("Initiation" → "Project Kickoff"),
 * and the color must survive renaming. Reporting keys are stable.
 *
 * Reverse lookup by phase name is provided as a secondary path because the
 * existing `WaterfallPhase` interface in WaterfallTable only carries `name`
 * and `sortOrder` from `/work/projects/:id/plan` — the reportingKey is on
 * the backend but not yet exposed in that response. Until the API is
 * extended (Phase 5+), name-based lookup using the canonical PMI names
 * keeps the colors visible without an API change.
 */
const NAME_TO_REPORTING_KEY: Readonly<Record<string, string>> = Object.freeze({
  Initiation: 'INIT',
  Planning: 'PLAN',
  Execution: 'EXEC',
  'Monitoring and Control': 'MONITOR',
  Closure: 'CLOSE',
});

export function getPhaseColor(
  phase: { reportingKey?: string | null; name?: string | null },
): string {
  if (phase.reportingKey && WATERFALL_PHASE_COLORS[phase.reportingKey]) {
    return WATERFALL_PHASE_COLORS[phase.reportingKey];
  }
  if (phase.name && NAME_TO_REPORTING_KEY[phase.name]) {
    const key = NAME_TO_REPORTING_KEY[phase.name];
    return WATERFALL_PHASE_COLORS[key] ?? DEFAULT_PHASE_COLOR;
  }
  return DEFAULT_PHASE_COLOR;
}
