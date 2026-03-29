/**
 * Prompt 5b / Prompt 3 backend: phase gate execution (PMBOK-style decisions).
 * Mirrors `work-management` enums/DTOs and `ExecuteGateDecisionResult`.
 */

/** @see zephix-backend gate-decision-type.enum.ts */
export enum GateDecisionType {
  GO = 'GO',
  NO_GO = 'NO_GO',
  CONDITIONAL_GO = 'CONDITIONAL_GO',
  RECYCLE = 'RECYCLE',
  HOLD = 'HOLD',
  KILL = 'KILL',
}

/** @see gate-cycle-state.enum.ts */
export enum GateCycleState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RECYCLED = 'RECYCLED',
}

/** @see gate-condition-status.enum.ts */
export enum GateConditionStatus {
  PENDING = 'PENDING',
  SATISFIED = 'SATISFIED',
  WAIVED = 'WAIVED',
}

/** One item in `conditions[]` for CONDITIONAL_GO. */
export interface GateConditionPayloadItem {
  label: string;
  sortOrder?: number;
}

/** POST .../gates/:gateDefinitionId/execute-decision */
export interface ExecuteGateDecisionPayload {
  decision: GateDecisionType;
  /** Required when decision === CONDITIONAL_GO */
  nextPhaseId?: string;
  /** Required when decision === CONDITIONAL_GO (min 1 item) */
  conditions?: GateConditionPayloadItem[];
  note?: string;
}

/** @see ProjectGovernanceService PmbokGateRoute */
export type PmbokGateRoute =
  | 'PROJECT_COMPLETED'
  | 'ADVANCED_TO_NEXT_PHASE'
  | 'ROUTED_TO_PHASE'
  | 'CONDITIONAL_GO_ROUTED'
  | 'NO_GO_HELD'
  | 'RECYCLE'
  | 'HOLD'
  | 'KILL';

/** Mirrors backend `ProjectState` for gate result payload. */
export type ProjectLifecycleState =
  | 'DRAFT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'TERMINATED';

export interface ExecuteGateDecisionResult {
  gateDefinitionId: string;
  decision: GateDecisionType;
  pmbokRoute: PmbokGateRoute;
  completedPhaseId: string | null;
  targetPhaseId: string | null;
  projectState: ProjectLifecycleState | null;
  gateConditionIds?: string[];
  conditionTaskIds?: string[];
  newCycleId?: string | null;
}

/** Mirrors `gate_cycles` (camelCase JSON). */
export interface GateCycle {
  id: string;
  organizationId: string;
  workspaceId: string;
  phaseGateDefinitionId: string;
  cycleNumber: number;
  cycleState: GateCycleState;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Mirrors `gate_conditions` (camelCase JSON). */
export interface GateCondition {
  id: string;
  organizationId: string;
  workspaceId: string;
  gateCycleId: string;
  label: string;
  conditionStatus: GateConditionStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
