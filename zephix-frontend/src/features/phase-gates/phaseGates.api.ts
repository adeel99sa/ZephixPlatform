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
