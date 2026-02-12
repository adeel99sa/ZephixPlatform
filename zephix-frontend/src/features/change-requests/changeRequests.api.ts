/**
 * Change Requests API client
 */
import { request } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

export type ChangeRequestType =
  | 'SCOPE'
  | 'SCHEDULE'
  | 'COST'
  | 'RESOURCE'
  | 'RISK'
  | 'QUALITY'
  | 'PROCUREMENT'
  | 'OTHER';

export type ChangeRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IMPLEMENTED'
  | 'CANCELLED';

export interface ChangeRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  type: ChangeRequestType;
  status: ChangeRequestStatus;
  requestedByUserId: string;
  ownerUserId: string | null;
  dueDate: string | null;
  scopeImpact: string | null;
  scheduleImpactDays: number | null;
  costImpactAmount: number | null;
  riskImpact: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedTask {
  id: string;
  title: string;
  status: string;
}

export interface LinkedRisk {
  id: string;
  title: string;
  severity: string;
}

export interface ChangeRequestDetail extends ChangeRequest {
  linkedTasks: LinkedTask[];
  linkedRisks: LinkedRisk[];
}

export interface CreateChangeRequestInput {
  title: string;
  type: ChangeRequestType;
  description?: string;
  ownerUserId?: string;
  dueDate?: string;
  scopeImpact?: string;
  scheduleImpactDays?: number;
  costImpactAmount?: number;
  riskImpact?: string;
}

export interface UpdateChangeRequestInput {
  title?: string;
  description?: string;
  type?: ChangeRequestType;
  ownerUserId?: string;
  dueDate?: string;
  scopeImpact?: string;
  scheduleImpactDays?: number;
  costImpactAmount?: number;
  riskImpact?: string;
}

// ─── Normalizer ─────────────────────────────────────────────

function normalizeCR(raw: Record<string, unknown>): ChangeRequest {
  return {
    id: String(raw.id ?? ''),
    organizationId: String(raw.organizationId ?? raw.organization_id ?? ''),
    workspaceId: String(raw.workspaceId ?? raw.workspace_id ?? ''),
    projectId: String(raw.projectId ?? raw.project_id ?? ''),
    title: String(raw.title ?? ''),
    description: (raw.description as string) || null,
    type: String(raw.type ?? 'OTHER') as ChangeRequestType,
    status: String(raw.status ?? 'DRAFT') as ChangeRequestStatus,
    requestedByUserId: String(raw.requestedByUserId ?? raw.requested_by_user_id ?? ''),
    ownerUserId: (raw.ownerUserId ?? raw.owner_user_id ?? null) as string | null,
    dueDate: (raw.dueDate ?? raw.due_date ?? null) as string | null,
    scopeImpact: (raw.scopeImpact ?? raw.scope_impact ?? null) as string | null,
    scheduleImpactDays: (raw.scheduleImpactDays ?? raw.schedule_impact_days ?? null) as number | null,
    costImpactAmount: (raw.costImpactAmount ?? raw.cost_impact_amount ?? null) as number | null,
    riskImpact: (raw.riskImpact ?? raw.risk_impact ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ''),
  };
}

// ─── API Functions ──────────────────────────────────────────

export async function listChangeRequests(
  projectId: string,
  params?: { status?: string; type?: string; search?: string },
): Promise<{ items: ChangeRequest[]; total: number }> {
  const data = await request.get<Record<string, unknown>>(
    `/work/projects/${projectId}/change-requests`,
    { params },
  );
  const items = Array.isArray((data as any).items)
    ? (data as any).items.map((r: Record<string, unknown>) => normalizeCR(r))
    : [];
  return { items, total: (data as any).total ?? items.length };
}

export async function createChangeRequest(
  projectId: string,
  input: CreateChangeRequestInput,
): Promise<ChangeRequest> {
  const data = await request.post<Record<string, unknown>>(
    `/work/projects/${projectId}/change-requests`,
    input,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function getChangeRequestDetail(
  id: string,
): Promise<ChangeRequestDetail> {
  const data = await request.get<Record<string, unknown>>(
    `/work/change-requests/${id}`,
  );
  const raw = data as Record<string, unknown>;
  const base = normalizeCR(raw);
  return {
    ...base,
    linkedTasks: Array.isArray(raw.linkedTasks) ? (raw.linkedTasks as LinkedTask[]) : [],
    linkedRisks: Array.isArray(raw.linkedRisks) ? (raw.linkedRisks as LinkedRisk[]) : [],
  };
}

export async function updateChangeRequest(
  id: string,
  input: UpdateChangeRequestInput,
): Promise<ChangeRequest> {
  const data = await request.patch<Record<string, unknown>>(
    `/work/change-requests/${id}`,
    input,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function submitChangeRequest(id: string): Promise<ChangeRequest> {
  const data = await request.post<Record<string, unknown>>(
    `/work/change-requests/${id}/submit`,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function approveChangeRequest(id: string): Promise<ChangeRequest> {
  const data = await request.post<Record<string, unknown>>(
    `/work/change-requests/${id}/approve`,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function rejectChangeRequest(id: string): Promise<ChangeRequest> {
  const data = await request.post<Record<string, unknown>>(
    `/work/change-requests/${id}/reject`,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function implementChangeRequest(id: string): Promise<ChangeRequest> {
  const data = await request.post<Record<string, unknown>>(
    `/work/change-requests/${id}/implement`,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function cancelChangeRequest(id: string): Promise<ChangeRequest> {
  const data = await request.post<Record<string, unknown>>(
    `/work/change-requests/${id}/cancel`,
  );
  return normalizeCR(data as Record<string, unknown>);
}

export async function deleteChangeRequest(id: string): Promise<void> {
  await request.delete(`/work/change-requests/${id}`);
}

export async function linkTask(changeRequestId: string, taskId: string): Promise<void> {
  await request.post(`/work/change-requests/${changeRequestId}/link-task`, { taskId });
}

export async function unlinkTask(changeRequestId: string, taskId: string): Promise<void> {
  await request.delete(`/work/change-requests/${changeRequestId}/link-task/${taskId}`);
}

export async function linkRisk(changeRequestId: string, riskId: string): Promise<void> {
  await request.post(`/work/change-requests/${changeRequestId}/link-risk`, { riskId });
}

export async function unlinkRisk(changeRequestId: string, riskId: string): Promise<void> {
  await request.delete(`/work/change-requests/${changeRequestId}/link-risk/${riskId}`);
}
