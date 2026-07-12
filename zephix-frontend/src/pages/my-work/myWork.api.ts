/**
 * MP-3 — My Work feed client (GET /work/my-tasks).
 */
import { request } from '@/lib/api';

export type MyTasksBucket = 'open' | 'done' | 'cancelled';
export type MyTasksSortBy = 'dueDate' | 'updatedAt' | 'createdAt';
export type MyTasksSortDir = 'asc' | 'desc';

export type MyTaskRow = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate: string | null;
  startDate?: string | null;
  projectId: string;
  projectName: string | null;
  workspaceId: string;
  workspaceName: string | null;
  phaseId?: string | null;
  phaseName?: string | null;
  iterationId?: string | null;
  assigneeUserId?: string | null;
  updatedAt: string;
  createdAt: string;
};

export type MyTasksAggregates = {
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  totalAssigned: number;
};

export type MyTasksResponse = {
  items: MyTaskRow[];
  aggregates: MyTasksAggregates;
  total: number;
  limit: number;
  offset: number;
};

export type ListMyTasksParams = {
  bucket?: MyTasksBucket;
  search?: string;
  sortBy?: MyTasksSortBy;
  sortDir?: MyTasksSortDir;
  limit?: number;
  offset?: number;
  dueFrom?: string;
  dueTo?: string;
};

const EMPTY_AGGREGATES: MyTasksAggregates = {
  overdueCount: 0,
  dueTodayCount: 0,
  dueThisWeekCount: 0,
  totalAssigned: 0,
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function toStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  return s.length ? s : null;
}

function toNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function normalizeRow(raw: unknown): MyTaskRow | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = toStringOrNull(r.id);
  const title = toStringOrNull(r.title);
  const projectId = toStringOrNull(r.projectId ?? r.project_id);
  const workspaceId = toStringOrNull(r.workspaceId ?? r.workspace_id);
  if (!id || !title || !projectId || !workspaceId) return null;
  return {
    id,
    title,
    status: String(r.status ?? 'TODO'),
    priority: toStringOrNull(r.priority) ?? undefined,
    dueDate: toStringOrNull(r.dueDate ?? r.due_date),
    startDate: toStringOrNull(r.startDate ?? r.start_date),
    projectId,
    projectName: toStringOrNull(r.projectName ?? r.project_name),
    workspaceId,
    workspaceName: toStringOrNull(r.workspaceName ?? r.workspace_name),
    phaseId: toStringOrNull(r.phaseId ?? r.phase_id),
    phaseName: toStringOrNull(r.phaseName ?? r.phase_name),
    iterationId: toStringOrNull(r.iterationId ?? r.iteration_id),
    assigneeUserId: toStringOrNull(r.assigneeUserId ?? r.assignee_user_id),
    updatedAt: toStringOrNull(r.updatedAt ?? r.updated_at) ?? new Date().toISOString(),
    createdAt: toStringOrNull(r.createdAt ?? r.created_at) ?? new Date().toISOString(),
  };
}

function normalizeAggregates(raw: unknown): MyTasksAggregates {
  const r = asRecord(raw);
  if (!r) return { ...EMPTY_AGGREGATES };
  return {
    overdueCount: toNumber(r.overdueCount ?? r.overdue_count),
    dueTodayCount: toNumber(r.dueTodayCount ?? r.due_today_count),
    dueThisWeekCount: toNumber(r.dueThisWeekCount ?? r.due_this_week_count),
    totalAssigned: toNumber(r.totalAssigned ?? r.total_assigned),
  };
}

export function normalizeMyTasksResponse(payload: unknown): MyTasksResponse {
  const root = asRecord(payload);
  const nested = root && asRecord(root.data) ? asRecord(root.data) : root;
  const src = nested ?? {};
  const itemsRaw = Array.isArray(src.items) ? src.items : [];
  const items = itemsRaw.map(normalizeRow).filter((r): r is MyTaskRow => r != null);
  return {
    items,
    aggregates: normalizeAggregates(src.aggregates),
    total: toNumber(src.total, items.length),
    limit: toNumber(src.limit, 50),
    offset: toNumber(src.offset, 0),
  };
}

export async function listMyTasks(params: ListMyTasksParams = {}): Promise<MyTasksResponse> {
  const query: Record<string, string | number> = {
    sortBy: params.sortBy ?? 'dueDate',
    sortDir: params.sortDir ?? 'asc',
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  };
  if (params.bucket) query.bucket = params.bucket;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.dueFrom) query.dueFrom = params.dueFrom;
  if (params.dueTo) query.dueTo = params.dueTo;

  const payload = await request.get<unknown>('/work/my-tasks', { params: query });
  return normalizeMyTasksResponse(payload);
}
