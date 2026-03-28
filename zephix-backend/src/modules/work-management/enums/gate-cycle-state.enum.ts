/** Lifecycle of a single {@link GateCycle} instance. */
export enum GateCycleState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  /** Archived during RECYCLE — superseded by a new cycle. */
  RECYCLED = 'RECYCLED',
}
