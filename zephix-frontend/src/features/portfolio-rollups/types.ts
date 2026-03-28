// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Rollups Types — Phase 4.0
// Mirror backend dto/workspace-rollup.dto.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceRollupTotals {
  portfoliosCount: number;
  programsCount: number;
  projectsCount: number;
}

export interface WorkspaceRollupExecution {
  phases: {
    notStartedCount: number;
    activeCount: number;
    completedCount: number;
  };
  tasks: {
    totalCount: number;
    doneCount: number;
    overdueCount: number;
  };
}

export interface WorkspaceRollupGovernance {
  phaseGates: {
    enabled: boolean;
    phasesBlockedCount: number;
    phasesWarnCount: number;
    phasesOkCount: number;
  };
}

export interface WorkspaceRollupRisk {
  totalRisks: number;
  openRisks: number;
  highRisks: number;
}

export interface WorkspaceRollupResources {
  allocationsCount: number;
  overAllocatedCount: number;
}

export interface WorkspaceRollupBudget {
  projectsWithBudgetCount: number;
  totalBudget: number;
  totalActualCost: number;
  varianceTotal: number;
}

export interface WorkspaceRollupAgile {
  activeSprintsCount: number;
  completedSprintsCount: number;
  rollingVelocityAverage: number;
}

export interface WorkspaceRollupResponse {
  workspaceId: string;
  totals: WorkspaceRollupTotals;
  execution: WorkspaceRollupExecution;
  governance: WorkspaceRollupGovernance;
  risk: WorkspaceRollupRisk;
  resources: WorkspaceRollupResources;
  budget: WorkspaceRollupBudget;
  agile: WorkspaceRollupAgile;
}
