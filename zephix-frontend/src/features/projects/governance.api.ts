import { request } from '@/lib/api';

export type ApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RaidType = 'RISK' | 'ASSUMPTION' | 'ISSUE' | 'DECISION' | 'ACTION';
export type ReportStatus = 'GREEN' | 'AMBER' | 'RED';

export type ProjectApproval = {
  id: string;
  /** Gate definition this approval belongs to (list endpoint). */
  gateDefinitionId?: string;
  phaseId: string;
  phase: string;
  approvalType: string;
  status: ApprovalStatus;
  requestorUserId: string | null;
  approvers: Array<{
    stepId: string;
    name: string;
    /** Resolved role label or approval rule (ANY_ONE / ALL). */
    role?: string;
    approvalType?: string;
    status: string;
    minApprovals: number;
    decisions: Array<{ userId: string; decision: string; note: string | null; decidedAt: string }>;
  }>;
  requiredEvidence: string[];
  dependencyState: 'ready' | 'blocked';
  submittedAt: string | null;
  decidedAt: string | null;
};

export type ApprovalDetail = ProjectApproval & {
  /** PM / submitter notes — separate from {@link decisionNote} (audit). */
  submissionNote?: string | null;
  /** Approver or system notes after a decision. */
  decisionNote?: string | null;
  linkedEvidence: Array<{ id: string; title?: string; fileName?: string; tags?: string[] }>;
  blockingReasons: string[];
  missingApprovers: string[];
  missingEvidence: string[];
  openDependencies: Array<{
    id: string;
    predecessorTaskId: string;
    predecessorTitle: string;
    successorTaskId: string;
    successorTitle: string;
  }>;
  history: Array<{ userId: string; decision: string; note: string | null; decidedAt: string }>;
};

export type RaidItem = {
  id: string;
  source: 'risk' | 'task';
  type: RaidType;
  title: string;
  description: string | null;
  status: string;
  ownerUserId: string | null;
  severity: string | null;
  dueDate: string | null;
  linkedTaskCount: number;
  linkedDocCount: number;
  updatedAt: string;
};

export type GovernanceReport = {
  id: string;
  title: string;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  phase: string | null;
  overallStatus: ReportStatus;
  scheduleStatus: ReportStatus;
  resourceStatus: ReportStatus;
  executiveSummary: string | null;
  currentActivities: string | null;
  nextWeekActivities: string | null;
  helpNeeded: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listProjectApprovals(projectId: string): Promise<{ items: ProjectApproval[]; total: number }> {
  return request.get(`/projects/${projectId}/approvals`);
}

export async function getProjectApproval(projectId: string, approvalId: string): Promise<ApprovalDetail> {
  return request.get(`/projects/${projectId}/approvals/${approvalId}`);
}

export async function createProjectApproval(
  projectId: string,
  input: { phaseId: string; gateDefinitionId: string; documentIds?: string[]; checklistAnswers?: string[]; note?: string },
) {
  return request.post(`/projects/${projectId}/approvals`, input);
}

export async function submitProjectApproval(projectId: string, approvalId: string): Promise<ApprovalDetail> {
  return request.post(`/projects/${projectId}/approvals/${approvalId}/submit`);
}

/**
 * C-4: Create or update draft for the gate, then submit for review (backend authority for state).
 * Uses {@link createProjectApproval} + {@link submitProjectApproval} — canonical project governance routes.
 *
 * C-5: Prefer the returned {@link ApprovalDetail} (and subsequent GETs) as the source of truth for the
 * approval record — do not assume a single draft exists based on UI state alone.
 */
export async function submitPhaseGateForReview(
  projectId: string,
  phaseId: string,
  gateDefinitionId: string,
  notes: string,
): Promise<ApprovalDetail> {
  const draft = await createProjectApproval(projectId, {
    phaseId,
    gateDefinitionId,
    note: notes.trim() ? notes.trim() : undefined,
  });
  const id = (draft as { id?: string }).id;
  if (!id) {
    throw new Error('Invalid approval draft response');
  }
  return submitProjectApproval(projectId, id);
}

export async function decideProjectApproval(
  projectId: string,
  approvalId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<ApprovalDetail> {
  return request.post(`/projects/${projectId}/approvals/${approvalId}/decision`, { decision, note });
}

/** C-5: PMBOK gate decision on submission id — backend owns gate / project outcome. */
export type ProjectApprovalGateDecision =
  | 'GO'
  | 'CONDITIONAL_GO'
  | 'RECYCLE'
  | 'HOLD'
  | 'KILL';

export async function decideProjectApprovalGate(
  projectId: string,
  approvalId: string,
  body: {
    decision: ProjectApprovalGateDecision;
    notes: string;
    conditions?: Array<{ description: string }>;
    nextPhaseId?: string;
  },
): Promise<ApprovalDetail> {
  return request.post(`/projects/${projectId}/approvals/${approvalId}/decide`, body);
}

export async function getProjectApprovalReadiness(projectId: string): Promise<{
  items: Array<{
    approvalId: string;
    ready: boolean;
    status: 'ready' | 'not_ready';
    blockingReasons: string[];
    missingEvidence: string[];
    missingApprovers: string[];
    openDependencies: Array<{ id: string; predecessorTitle: string; successorTitle: string }>;
  }>;
}> {
  return request.get(`/projects/${projectId}/approval-readiness`);
}

export async function listProjectRaid(projectId: string): Promise<{ items: RaidItem[]; total: number }> {
  return request.get(`/projects/${projectId}/raid`);
}

export async function getProjectRaidItem(projectId: string, itemId: string): Promise<RaidItem> {
  return request.get(`/projects/${projectId}/raid/${itemId}`);
}

export async function createProjectRaidItem(
  projectId: string,
  input: {
    type: RaidType;
    title: string;
    description?: string;
    severity?: string;
    status?: string;
    ownerUserId?: string;
    dueDate?: string;
    linkedDocumentIds?: string[];
  },
) {
  return request.post(`/projects/${projectId}/raid`, input);
}

export async function updateProjectRaidItem(projectId: string, itemId: string, input: Record<string, unknown>) {
  return request.patch(`/projects/${projectId}/raid/${itemId}`, input);
}

export async function listProjectReports(projectId: string): Promise<{ items: GovernanceReport[]; total: number }> {
  return request.get(`/projects/${projectId}/reports`);
}

export async function getProjectReport(projectId: string, reportId: string): Promise<GovernanceReport> {
  return request.get(`/projects/${projectId}/reports/${reportId}`);
}

export async function createProjectReport(
  projectId: string,
  input: Partial<GovernanceReport> & { title: string },
): Promise<GovernanceReport> {
  return request.post(`/projects/${projectId}/reports`, input);
}

export async function updateProjectReport(
  projectId: string,
  reportId: string,
  input: Partial<GovernanceReport>,
): Promise<GovernanceReport> {
  return request.patch(`/projects/${projectId}/reports/${reportId}`, input);
}

export async function getProjectDependencies(projectId: string): Promise<{
  blockedCount: number;
  tasks: Array<{ id: string; title: string; status: string; phaseId: string | null }>;
  dependencies: Array<{
    id: string;
    type: string;
    predecessorTaskId: string;
    predecessorTitle: string;
    predecessorStatus: string | null;
    successorTaskId: string;
    successorTitle: string;
    successorStatus: string | null;
  }>;
}> {
  return request.get(`/projects/${projectId}/dependencies`);
}
