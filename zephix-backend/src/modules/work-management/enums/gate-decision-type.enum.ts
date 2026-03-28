/**
 * PMBOK-style phase gate outcomes (progressive governance execution).
 */
export enum GateDecisionType {
  /** Proceed; advance or complete project when no further phases exist. */
  GO = 'GO',
  /** Do not proceed; gate remains closed for rework (non-PMBOK extension). */
  NO_GO = 'NO_GO',
  /**
   * Proceed with conditions: route to `nextPhaseId`, create `GateCondition` rows
   * and spawn condition artifact tasks in the target phase.
   */
  CONDITIONAL_GO = 'CONDITIONAL_GO',
  /** Archive current cycle as RECYCLED, open next cycle, DONE→REWORK on gate artifacts. */
  RECYCLE = 'RECYCLE',
  /** Pause project: ON_HOLD + FROZEN phases. */
  HOLD = 'HOLD',
  /** Terminate project: TERMINATED + LOCKED phases + CANCELED tasks. */
  KILL = 'KILL',
}
