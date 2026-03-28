/**
 * Phase Gates API client
 */
import { request } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

export type GateDefinitionStatus = 'ACTIVE' | 'DISABLED';
export type GateSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RequiredDocumentsConfig {
  requiredCount?: number | null;
  requiredTags?: string[] | null;
}

export interface RequiredChecklistConfig {
  items: string[];
}

export interface GateDefinition {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  phaseId: string;
  name: string;
  status: GateDefinitionStatus;
  enforcementMode?: string;
  reviewersRolePolicy: Record<string, unknown> | null;
  requiredDocuments: RequiredDocumentsConfig | null;
  requiredChecklist: RequiredChecklistConfig | null;
  thresholds: Record<string, unknown> | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GateSubmission {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  phaseId: string;
  gateDefinitionId: string;
  status: GateSubmissionStatus;
  submittedByUserId: string | null;
  submittedAt: string | null;
  decisionByUserId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  checklistSnapshot: Record<string, unknown> | null;
  documentsSnapshot: Record<string, unknown>[] | null;
  createdAt: string;
  updatedAt: string;
  linkedDocuments?: Array<{
    id: string;
    title: string;
    fileName: string;
    tags?: string[] | null;
  }>;
}

export interface UpsertGatePayload {
  name: string;
  requiredDocuments?: RequiredDocumentsConfig;
  requiredChecklist?: RequiredChecklistConfig;
  thresholds?: Record<string, unknown>;
  status?: GateDefinitionStatus;
}

export interface SubmitGatePayload {
  checklistAnswers?: string[];
  documentIds?: string[];
  note?: string;
  confirmWarnings?: boolean;
}

export interface DecideGatePayload {
  decisionNote?: string;
}

// ─── Helper to unwrap response envelope ─────────────────────

function unwrap<T>(resp: unknown): T {
  if (resp && typeof resp === 'object' && 'data' in resp) {
    return (resp as { data: T }).data;
  }
  return resp as T;
}

// ─── API Functions ──────────────────────────────────────────

export async function getGateDefinition(
  projectId: string,
  phaseId: string,
): Promise<GateDefinition | null> {
  const resp = await request.get<unknown>(
    `/work/projects/${projectId}/phases/${phaseId}/gate`,
  );
  return unwrap<GateDefinition | null>(resp);
}

export async function upsertGateDefinition(
  projectId: string,
  phaseId: string,
  payload: UpsertGatePayload,
): Promise<GateDefinition> {
  const resp = await request.put<unknown>(
    `/work/projects/${projectId}/phases/${phaseId}/gate`,
    payload,
  );
  return unwrap<GateDefinition>(resp);
}

export async function createDraftSubmission(
  projectId: string,
  phaseId: string,
): Promise<GateSubmission> {
  const resp = await request.post<unknown>(
    `/work/projects/${projectId}/phases/${phaseId}/gate/submissions/draft`,
  );
  return unwrap<GateSubmission>(resp);
}

export async function listGateSubmissions(
  projectId: string,
  params?: { status?: GateSubmissionStatus; phaseId?: string; limit?: number; offset?: number },
): Promise<{ items: GateSubmission[]; total: number }> {
  const resp = await request.get<unknown>(
    `/work/projects/${projectId}/gate-submissions`,
    { params },
  );
  return unwrap<{ items: GateSubmission[]; total: number }>(resp);
}

export async function getGateSubmission(
  id: string,
): Promise<GateSubmission> {
  const resp = await request.get<unknown>(`/work/gate-submissions/${id}`);
  return unwrap<GateSubmission>(resp);
}

export async function submitGateSubmission(
  id: string,
  payload: SubmitGatePayload,
): Promise<GateSubmission> {
  const resp = await request.post<unknown>(
    `/work/gate-submissions/${id}/submit`,
    payload,
  );
  return unwrap<GateSubmission>(resp);
}

export async function approveGateSubmission(
  id: string,
  payload?: DecideGatePayload,
): Promise<GateSubmission> {
  const resp = await request.post<unknown>(
    `/work/gate-submissions/${id}/approve`,
    payload || {},
  );
  return unwrap<GateSubmission>(resp);
}

export async function rejectGateSubmission(
  id: string,
  payload?: DecideGatePayload,
): Promise<GateSubmission> {
  const resp = await request.post<unknown>(
    `/work/gate-submissions/${id}/reject`,
    payload || {},
  );
  return unwrap<GateSubmission>(resp);
}

export async function cancelGateSubmission(
  id: string,
  payload?: DecideGatePayload,
): Promise<GateSubmission> {
  const resp = await request.post<unknown>(
    `/work/gate-submissions/${id}/cancel`,
    payload || {},
  );
  return unwrap<GateSubmission>(resp);
}

// ─── Sprint 10: Approval Chain Types ─────────────────────

export type ApprovalType = 'ANY_ONE' | 'ALL';
export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'ABSTAINED';
export type StepStatus = 'PENDING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
export type ChainStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface ApprovalChainStep {
  id: string;
  chainId: string;
  stepOrder: number;
  name: string;
  description: string | null;
  requiredRole: string | null;
  requiredUserId: string | null;
  approvalType: ApprovalType;
  minApprovals: number;
  autoApproveAfterHours: number | null;
}

export interface ApprovalChain {
  id: string;
  gateDefinitionId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  steps: ApprovalChainStep[];
}

export interface StepDecision {
  userId: string;
  decision: ApprovalDecision;
  note: string | null;
  decidedAt: string;
}

export interface StepApprovalState {
  stepId: string;
  stepOrder: number;
  name: string;
  approvalType: ApprovalType;
  minApprovals: number;
  status: StepStatus;
  decisions: StepDecision[];
}

export interface ChainExecutionState {
  chainId: string;
  submissionId: string;
  chainStatus: ChainStatus;
  activeStepId: string | null;
  steps: StepApprovalState[];
}

export interface CreateChainPayload {
  gateDefinitionId: string;
  name: string;
  description?: string;
  steps: Array<{
    name: string;
    description?: string;
    requiredRole?: string;
    requiredUserId?: string;
    approvalType?: ApprovalType;
    minApprovals?: number;
    autoApproveAfterHours?: number;
  }>;
}

// ─── Sprint 10: Approval Chain API Functions ─────────────

export async function getApprovalChain(
  gateDefinitionId: string,
): Promise<ApprovalChain | null> {
  const resp = await request.get<unknown>(
    `/work/gate-definitions/${gateDefinitionId}/approval-chain`,
  );
  return unwrap<ApprovalChain | null>(resp);
}

export async function createApprovalChain(
  payload: CreateChainPayload,
): Promise<ApprovalChain> {
  const resp = await request.post<unknown>(
    `/work/gate-definitions/approval-chains`,
    payload,
  );
  return unwrap<ApprovalChain>(resp);
}

export async function reorderApprovalSteps(
  chainId: string,
  stepIds: string[],
): Promise<ApprovalChain> {
  const resp = await request.put<unknown>(
    `/work/gate-definitions/approval-chains/${chainId}/reorder`,
    { stepIds },
  );
  return unwrap<ApprovalChain>(resp);
}

export async function deleteApprovalChain(
  chainId: string,
): Promise<void> {
  await request.delete(`/work/gate-definitions/approval-chains/${chainId}`);
}

export async function getApprovalState(
  submissionId: string,
): Promise<ChainExecutionState | null> {
  const resp = await request.get<unknown>(
    `/work/gate-submissions/${submissionId}/approval-state`,
  );
  return unwrap<ChainExecutionState | null>(resp);
}

export async function approveApprovalStep(
  submissionId: string,
  note?: string,
): Promise<ChainExecutionState> {
  const resp = await request.post<unknown>(
    `/work/gate-submissions/${submissionId}/approve`,
    { note },
  );
  return unwrap<ChainExecutionState>(resp);
}

export async function rejectApprovalStep(
  submissionId: string,
  note?: string,
): Promise<ChainExecutionState> {
  const resp = await request.post<unknown>(
    `/work/gate-submissions/${submissionId}/reject`,
    { note },
  );
  return unwrap<ChainExecutionState>(resp);
}
