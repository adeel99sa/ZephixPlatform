/**
 * Wire-format adapter only: maps GET /work/projects/:projectId/phases/:phaseId/gate
 * (and future `state` / `decision` fields) onto {@link InlinePhaseGate}.
 * No readiness inference — if the API later sends `state` + `decision`, those win.
 */
import type {
  InlineGateDecision,
  InlineGateState,
  InlinePhaseGate,
} from "./inline-phase-gate.types";

const INLINE_STATES = new Set<string>(["LOCKED", "READY", "IN_REVIEW", "DECIDED"]);

const INLINE_DECISIONS = new Set<string>([
  "GO",
  "CONDITIONAL_GO",
  "RECYCLE",
  "HOLD",
  "KILL",
]);

function asRecord(x: unknown): Record<string, unknown> | null {
  if (x && typeof x === "object") {
    return x as Record<string, unknown>;
  }
  return null;
}

function parseInlineState(v: unknown): InlineGateState | null {
  if (typeof v !== "string" || !INLINE_STATES.has(v)) {
    return null;
  }
  return v as InlineGateState;
}

function parseInlineDecision(v: unknown): InlineGateDecision | null {
  if (v == null || v === "") {
    return null;
  }
  if (typeof v !== "string" || !INLINE_DECISIONS.has(v)) {
    return null;
  }
  return v as InlineGateDecision;
}

/**
 * Maps legacy `reviewState` (GateReviewState) to inline contract when `state` is absent.
 */
function stateFromReviewState(
  reviewState: string | undefined,
): InlineGateState {
  switch (reviewState) {
    case "READY_FOR_REVIEW":
      return "READY";
    case "IN_REVIEW":
      return "IN_REVIEW";
    case "LOCKED":
      return "LOCKED";
    case "APPROVED":
    case "REJECTED":
      return "DECIDED";
    case "NOT_STARTED":
    case "AWAITING_CONDITIONS":
    default:
      return "LOCKED";
  }
}

function decisionFromReviewState(
  reviewState: string | undefined,
): InlineGateDecision | null {
  if (reviewState === "APPROVED") {
    return "GO";
  }
  if (reviewState === "REJECTED") {
    return "RECYCLE";
  }
  return null;
}

/**
 * Accepts `GateDefinition` from the client or any future envelope; prefers
 * `state` / `decision` when present on the payload.
 */
export function toInlinePhaseGateFromApi(raw: unknown): InlinePhaseGate | null {
  if (raw == null) {
    return null;
  }
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = String(r.id ?? "");
  const name = String(r.name ?? "Gate");
  const fromPhaseId = String(r.phaseId ?? r.fromPhaseId ?? r.from_phase_id ?? "");
  if (!id || !fromPhaseId) {
    return null;
  }

  const directState = parseInlineState(
    r.state ?? r["state"],
  );
  const reviewState =
    typeof r.reviewState === "string"
      ? r.reviewState
      : typeof r.review_state === "string"
        ? r.review_state
        : undefined;

  const state: InlineGateState =
    directState ?? stateFromReviewState(reviewState);

  const directDecision = parseInlineDecision(
    r.decision ?? r["decision"],
  );
  const decision: InlineGateDecision | null =
    directDecision ??
    (state === "DECIDED" ? decisionFromReviewState(reviewState) : null);

  const pendingApproverCount =
    typeof r.pendingApproverCount === "number"
      ? r.pendingApproverCount
      : typeof r.pending_approver_count === "number"
        ? r.pending_approver_count
        : 0;

  const decidedByUserName =
    r.decidedByUserName != null
      ? String(r.decidedByUserName)
      : r.decided_by_user_name != null
        ? String(r.decided_by_user_name)
        : null;

  const decidedAt =
    r.decidedAt != null
      ? String(r.decidedAt)
      : r.decided_at != null
        ? String(r.decided_at)
        : null;

  const submittedAt =
    r.submittedAt != null
      ? String(r.submittedAt)
      : r.submitted_at != null
        ? String(r.submitted_at)
        : null;

  const decisionSummary =
    r.decisionSummary != null
      ? String(r.decisionSummary)
      : r.decision_summary != null
        ? String(r.decision_summary)
        : null;

  /** Recycle cycle — adapter-only; never infer client-side. */
  let cycleNumber: number | null = null;
  const currentCycle = r.currentCycle ?? r.current_cycle;
  if (currentCycle && typeof currentCycle === "object") {
    const cc = currentCycle as Record<string, unknown>;
    const n = cc.cycleNumber ?? cc.cycle_number;
    if (typeof n === "number" && Number.isFinite(n) && n > 0) {
      cycleNumber = n;
    }
  }

  const blockedRaw = r.blockedByConditionsCount ?? r.blocked_by_conditions_count;
  const blockedByConditionsCount =
    typeof blockedRaw === "number" && Number.isFinite(blockedRaw) && blockedRaw >= 0
      ? blockedRaw
      : 0;

  return {
    id,
    name,
    fromPhaseId,
    state,
    decision,
    pendingApproverCount,
    decidedByUserName,
    decidedAt,
    submittedAt: submittedAt ?? null,
    decisionSummary: decisionSummary ?? null,
    cycleNumber,
    blockedByConditionsCount,
  };
}
