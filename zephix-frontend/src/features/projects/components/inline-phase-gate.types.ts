/**
 * C-3 Inline phase gate — UI contract. Render only `state` and `decision` from this object.
 * Populated by {@link toInlinePhaseGateFromApi} from GET …/phases/:phaseId/gate (or future fields).
 *
 * C-5: Do not add client-only “submitted” flags here — after mutations, refetch gate JSON and map
 * through the adapter. Resolve the active approval record from API responses, not assumed draft IDs.
 */

export type InlineGateState = "LOCKED" | "READY" | "IN_REVIEW" | "DECIDED";

export type InlineGateDecision =
  | "GO"
  | "CONDITIONAL_GO"
  | "RECYCLE"
  | "HOLD"
  | "KILL";

export type InlinePhaseGate = {
  id: string;
  name: string;
  fromPhaseId: string;
  state: InlineGateState;
  decision: InlineGateDecision | null;
  pendingApproverCount: number;
  decidedByUserName: string | null;
  decidedAt: string | null;
  submittedAt?: string | null;
  decisionSummary?: string | null;
  /** Gate cycle from backend `currentCycle.cycleNumber` (recycle); omit when unknown. */
  cycleNumber?: number | null;
  /**
   * C-8: Open gate conditions still PENDING on the active cycle — from backend only.
   * Do not derive from tasks in the UI.
   */
  blockedByConditionsCount?: number;
};
