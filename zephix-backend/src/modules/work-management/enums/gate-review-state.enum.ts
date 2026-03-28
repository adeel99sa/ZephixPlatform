/**
 * High-level gate review lifecycle on {@link PhaseGateDefinition} (progressive governance).
 */
export enum GateReviewState {
  NOT_STARTED = 'NOT_STARTED',
  AWAITING_CONDITIONS = 'AWAITING_CONDITIONS',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  /** Gate locked for a new cycle after RECYCLE. */
  LOCKED = 'LOCKED',
}
