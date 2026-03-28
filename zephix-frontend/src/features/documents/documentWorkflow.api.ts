/**
 * Template Center Document Workflow API
 * Manages document lifecycle (draft → review → approved → completed)
 */
import { api } from '@/lib/api';
import { getActiveWorkspaceId } from '@/utils/workspace';

// ─── Types ─────────────────────────────────────────────────

export type DocumentStatus =
  | 'not_started'
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'completed'
  | 'superseded';

export type DocumentAction =
  | 'start_draft'
  | 'submit_for_review'
  | 'approve'
  | 'request_changes'
  | 'mark_complete'
  | 'create_new_version';

export interface DocumentInstanceSummary {
  id: string;
  projectId: string;
  docKey: string;
  title: string;
  status: DocumentStatus;
  version: number;
  ownerUserId: string | null;
  reviewerUserId: string | null;
  isRequired: boolean;
  blocksGateKey: string | null;
  updatedAt: string;
}

export interface DocumentLatest {
  id: string;
  projectId: string;
  docKey: string;
  title: string;
  status: DocumentStatus;
  version: number;
  content?: any | null;
  externalUrl?: string | null;
  fileStorageKey?: string | null;
  changeSummary?: string | null;
  isRequired: boolean;
  blocksGateKey: string | null;
  dueDate?: string | null;
  updatedAt: string;
}

export interface DocumentHistoryItem {
  version: number;
  status: DocumentStatus;
  changeSummary?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface DocumentTransitionPayload {
  action: DocumentAction;
  changeSummary?: string;
  content?: Record<string, any>;
  externalUrl?: string;
}

// ─── Allowed transitions map ───────────────────────────────

export const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentAction[]> = {
  not_started: ['start_draft'],
  draft: ['submit_for_review'],
  in_review: ['approve', 'request_changes'],
  approved: ['mark_complete'],
  completed: ['create_new_version'],
  superseded: [],
};

export const ACTION_LABELS: Record<DocumentAction, string> = {
  start_draft: 'Start Draft',
  submit_for_review: 'Submit for Review',
  approve: 'Approve',
  request_changes: 'Request Changes',
  mark_complete: 'Mark Complete',
  create_new_version: 'New Version',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  not_started: 'Not Started',
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  completed: 'Completed',
  superseded: 'Superseded',
};

// ─── API Functions ─────────────────────────────────────────

function headers() {
  const wsId = getActiveWorkspaceId();
  return wsId ? { 'x-workspace-id': wsId } : {};
}

export async function listProjectDocumentWorkflow(
  projectId: string,
): Promise<DocumentInstanceSummary[]> {
  const res = await api.get(
    `/template-center/projects/${projectId}/documents`,
    { headers: headers() },
  );
  return (res.data?.data ?? res.data) || [];
}

export async function getDocumentLatest(
  projectId: string,
  documentId: string,
): Promise<DocumentLatest> {
  const res = await api.get(
    `/template-center/projects/${projectId}/documents/${documentId}`,
    { headers: headers() },
  );
  return res.data?.data ?? res.data;
}

export async function getDocumentHistory(
  projectId: string,
  documentId: string,
): Promise<DocumentHistoryItem[]> {
  const res = await api.get(
    `/template-center/projects/${projectId}/documents/${documentId}/history`,
    { headers: headers() },
  );
  return (res.data?.data ?? res.data) || [];
}

export async function transitionDocument(
  projectId: string,
  documentId: string,
  payload: DocumentTransitionPayload,
): Promise<void> {
  await api.post(
    `/template-center/projects/${projectId}/documents/${documentId}/transition`,
    payload,
    { headers: headers() },
  );
}
