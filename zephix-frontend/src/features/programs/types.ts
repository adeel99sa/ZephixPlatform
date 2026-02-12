/**
 * Sprint 8: Program rollup and schedule types.
 *
 * These match the backend ProgramRollupResponseDto + ProgramScheduleRollupDto.
 * All schedule fields are optional to protect older clients.
 */

export interface ProgramBasic {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  portfolioId: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  healthStatus: string | null;
}

export interface RollupTotals {
  projectsTotal: number;
  projectsActive: number;
  projectsAtRisk: number;
  workItemsOpen: number;
  workItemsOverdue: number;
  resourceConflictsOpen: number;
  risksActive: number;
}

export interface RollupHealth {
  status: 'green' | 'yellow' | 'red';
  reasons: string[];
  updatedAt: string;
}

export interface BudgetRollup {
  aggregateBAC: number;
  aggregateAC: number;
  aggregateEAC: number;
  aggregateVariance: number;
  aggregateCPI: number | null;
}

// ─── Sprint 8: Schedule rollup types ────────────────────────────────────────

export interface ProjectScheduleItem {
  projectId: string;
  projectName: string;
  startDate: string | null;
  endDate: string | null;
  phaseId?: string | null;
  phaseName?: string | null;
  phaseStatus?: string | null;
  nextGateDate?: string | null;
  scheduleStatus?: string | null;
  scheduleDeltaDays?: number | null;
  riskOpenCount?: number;
  riskHighestLevel?: string | null;
  budgetStatus?: string | null;
  budgetCPI?: number | null;
  resourceConflictSeverity?: string | null;
}

export interface Milestone {
  taskId: string;
  title: string;
  date: string | null;
  projectId: string;
  projectName?: string;
  status?: string;
}

export interface ScheduleWarning {
  code: string;
  message: string;
  projectId?: string | null;
}

export interface ProgramScheduleRollup {
  horizonStart: string;
  horizonEnd: string;
  earliestStartDate: string | null;
  latestEndDate: string | null;
  projectDateRangeItems: ProjectScheduleItem[];
  milestones: Milestone[];
  warnings: ScheduleWarning[];
  projectsAtRiskCount: number;
  projectsCriticalCount: number;
}

// ─── Full rollup response ───────────────────────────────────────────────────

export interface ProgramRollup {
  version: number;
  program: ProgramBasic;
  totals: RollupTotals;
  health: RollupHealth;
  projects: ProjectSummary[];
  budget?: BudgetRollup | null;
  schedule?: ProgramScheduleRollup | null;
}
