/**
 * Work Phases API — phase mutations (rename, due date, milestone toggle).
 *
 * Phase 5 (2026-04-08) — Created to support inline phase name editing in
 * the Waterfall table. Operator complaint: "I am unable to edit phases
 * name i cannot force customer to take our phases name companies have
 * different name for it also does the same exact thing but naming
 * different." Phase names must be customer-renameable per workspace.
 *
 * The backend `PATCH /work/phases/:phaseId` endpoint already exists and
 * accepts `name`, `dueDate`, `sortOrder`, `reportingKey`, `isMilestone`
 * via `UpdateWorkPhaseDto`. This frontend module wraps it.
 *
 * Why a separate file from workTasks.api.ts:
 *   - Phases and tasks are distinct entities with distinct lifecycles.
 *   - The phases API surface will grow (rename, color override, lock
 *     toggle, gate config) and deserves its own module rather than
 *     bloating the tasks file.
 *   - Matches the backend module structure (work-phases.controller.ts is
 *     separate from work-tasks.controller.ts).
 */

import { request } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';

/** Subset of `UpdateWorkPhaseDto` exposed to the frontend. */
export interface UpdateWorkPhasePatch {
  /** Customer-facing display name. May be renamed freely; reportingKey is the stable identifier. */
  name?: string;
  /** ISO 8601 due date (yyyy-mm-dd or full timestamp). */
  dueDate?: string | null;
  /** Phase ordering — usually managed via the reorder endpoint, but supported here for completeness. */
  sortOrder?: number;
  /**
   * Stable identifier used for governance, color palette lookup, gate
   * configuration, and reporting. Customers should rarely change this;
   * usually only the template author or workspace owner does.
   */
  reportingKey?: string;
  /** Milestone phase flag (gates a phase as a deliverable boundary). */
  isMilestone?: boolean;
}

/**
 * The shape of a phase as returned by `/work/projects/:id/plan` and the
 * `PATCH /work/phases/:phaseId` response. Mirrors the backend
 * `WorkPlanPhaseDto` but is the canonical frontend type going forward —
 * components should import from here, not redefine inline.
 */
export interface WorkPhase {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  startDate: string | null;
  dueDate: string | null;
  isLocked: boolean;
}

function requireActiveWorkspace(): void {
  const ws = useWorkspaceStore.getState().activeWorkspaceId;
  if (!ws) {
    throw new Error(
      'No active workspace selected — phase mutations require x-workspace-id',
    );
  }
}

/**
 * PATCH /work/phases/:phaseId
 *
 * Updates a phase. Sends only the fields present in `patch` so the
 * backend can apply a minimal diff. Returns the updated phase.
 *
 * Note: when editing milestone phases, the backend may return an
 * `AckRequiredResponse` instead of the updated phase, requiring an
 * `x-ack-token` header on a follow-up retry. The simple-name-edit case
 * (this MVP path) does NOT trigger ack — only milestone toggles or due
 * date shifts on milestone phases do. If callers need to handle ack
 * flows, extend this function rather than scattering the logic.
 */
export async function updatePhase(
  phaseId: string,
  patch: UpdateWorkPhasePatch,
): Promise<WorkPhase> {
  requireActiveWorkspace();
  const data = await request.patch<Record<string, unknown>>(
    `/work/phases/${phaseId}`,
    patch,
  );
  return normalizePhase(data);
}

/**
 * Normalize a backend phase payload to the frontend `WorkPhase` shape.
 * The backend returns snake_case in some legacy paths and camelCase in
 * the v51+ paths; this helper handles both so call sites don't have to.
 */
function normalizePhase(raw: Record<string, unknown>): WorkPhase {
  const r = raw as any;
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    reportingKey: String(r.reportingKey ?? r.reporting_key ?? ''),
    isMilestone: Boolean(r.isMilestone ?? r.is_milestone ?? false),
    startDate: r.startDate ?? r.start_date ?? null,
    dueDate: r.dueDate ?? r.due_date ?? null,
    isLocked: Boolean(r.isLocked ?? r.is_locked ?? false),
  };
}
