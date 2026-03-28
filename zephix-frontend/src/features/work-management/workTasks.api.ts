/**
 * Work Tasks API – single source of truth for task CRUD, comments, activity, dependencies.
 * All calls use request from @/lib/api (x-workspace-id set by interceptor).
 * Fail fast if no active workspace; do not send the request.
 */

import { request } from "@/lib/api";
import { useWorkspaceStore } from "@/state/workspace.store";

// --- Types (UI-facing, camelCase; normalize backend naming here) ---

export type WorkTaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELED";

/**
 * Status transition rules matching backend.
 * Terminal states (DONE, CANCELED) have no transitions out.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<WorkTaskStatus, WorkTaskStatus[]> = {
  BACKLOG: ["TODO", "CANCELED"],
  TODO: ["IN_PROGRESS", "BLOCKED", "CANCELED"],
  IN_PROGRESS: ["BLOCKED", "IN_REVIEW", "DONE", "CANCELED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELED"],
  IN_REVIEW: ["IN_PROGRESS", "DONE", "CANCELED"],
  DONE: [],        // Terminal - no transitions out
  CANCELED: [],    // Terminal - no transitions out
};

/**
 * Get allowed next statuses for a given current status.
 */
export function getAllowedTransitions(currentStatus: WorkTaskStatus): WorkTaskStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(from: WorkTaskStatus, to: WorkTaskStatus): boolean {
  return getAllowedTransitions(from).includes(to);
}

export type WorkTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type WorkTaskType = "TASK" | "EPIC" | "MILESTONE" | "BUG";

export type DependencyType =
  | "FINISH_TO_START"
  | "START_TO_START"
  | "FINISH_TO_FINISH"
  | "START_TO_FINISH";

export interface WorkTask {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  parentTaskId: string | null;
  phaseId: string | null;
  title: string;
  description: string | null;
  status: WorkTaskStatus;
  type: WorkTaskType;
  priority: WorkTaskPriority;
  assigneeUserId: string | null;
  reporterUserId: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  // Estimation fields
  estimatePoints: number | null;
  estimateHours: number | null;
  remainingHours: number | null;
  actualHours: number | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  iterationId: string | null;
  committed: boolean;
  rank: number | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  acceptanceCriteria: AcceptanceCriteriaItem[];
  createdAt: string;
  updatedAt: string;
  /** Soft delete timestamp. Null if task is active. */
  deletedAt: string | null;
  /** User who deleted the task. Null if task is active. */
  deletedByUserId: string | null;
}

export interface AcceptanceCriteriaItem {
  text: string;
  done: boolean;
}

export type SortBy = 'dueDate' | 'updatedAt' | 'createdAt' | 'rank';
export type SortDir = 'asc' | 'desc';

export interface ListTasksParams {
  projectId?: string;
  status?: WorkTaskStatus;
  assigneeUserId?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  includeStatuses?: string;
  excludeStatuses?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  limit?: number;
  offset?: number;
  /** Include soft-deleted tasks. Admin/Member only. */
  includeDeleted?: boolean;
  /** Filter by iteration ID */
  iterationId?: string;
  /** Filter committed tasks */
  committed?: boolean;
  /** Filter tasks with estimate points */
  hasEstimatePoints?: boolean;
  /** Filter tasks with estimate hours */
  hasEstimateHours?: boolean;
  /** Backlog tasks only (no iteration) */
  backlog?: boolean;
}

export interface ListTasksResult {
  items: WorkTask[];
  total: number;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  phaseId?: string;
  assigneeUserId?: string;
  dueDate?: string;
  priority?: WorkTaskPriority;
  tags?: string[];
  estimatePoints?: number;
  estimateHours?: number;
  iterationId?: string;
}

export interface UpdateTaskPatch {
  title?: string;
  description?: string;
  status?: WorkTaskStatus;
  priority?: WorkTaskPriority;
  assigneeUserId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  tags?: string[];
  acceptanceCriteria?: AcceptanceCriteriaItem[];
  estimatePoints?: number | null;
  estimateHours?: number | null;
  remainingHours?: number | null;
  actualHours?: number | null;
  iterationId?: string | null;
  committed?: boolean;
  rank?: number;
}

export interface BulkUpdateInput {
  taskIds: string[];
  status: WorkTaskStatus;
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  authorUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivityItem {
  id: string;
  taskId: string;
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: DependencyType;
  predecessorTitle?: string;
  successorTitle?: string;
}

// --- Work Phase types (for plan view) ---

export interface WorkPhase {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  isLocked: boolean;
  dueDate: string | null;
  tasks: WorkPlanTask[];
  /** Soft delete timestamp. Null if phase is active. */
  deletedAt?: string | null;
  /** User who deleted the phase. Null if phase is active. */
  deletedByUserId?: string | null;
}

/**
 * Deleted phase item (lighter weight, no tasks)
 */
export interface DeletedPhase {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  isLocked: boolean;
  dueDate: string | null;
  deletedAt: string | null;
  deletedByUserId: string | null;
}

/**
 * WorkPlanTask is the lightweight task shape returned by GET /work/projects/:id/plan.
 * It has fewer fields than the full WorkTask.
 */
export interface WorkPlanTask {
  id: string;
  title: string;
  status: WorkTaskStatus;
  rank?: number;
  ownerId: string | null;
  dueDate: string | null;
}

export interface ProjectPlan {
  projectId: string;
  projectName: string;
  projectState: string;
  structureLocked: boolean;
  phases: WorkPhase[];
}

function requireActiveWorkspace(): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) {
    const err = new Error("Active workspace required");
    (err as unknown as { code: string }).code = "WORKSPACE_REQUIRED";
    throw err;
  }
  return wsId;
}

/** Helper to extract string or null from raw value */
function toStringOrNull(val: unknown): string | null {
  return val != null ? String(val) : null;
}

/** Normalize backend snake_case to camelCase for a single task (if backend ever returns snake_case). */
function normalizeTask(raw: Record<string, unknown>): WorkTask {
  return {
    id: String(raw.id ?? ""),
    organizationId: String(raw.organizationId ?? raw.organization_id ?? ""),
    workspaceId: String(raw.workspaceId ?? raw.workspace_id ?? ""),
    projectId: String(raw.projectId ?? raw.project_id ?? ""),
    parentTaskId: toStringOrNull(raw.parentTaskId ?? raw.parent_task_id),
    phaseId: toStringOrNull(raw.phaseId ?? raw.phase_id),
    title: String(raw.title ?? ""),
    description: raw.description != null ? String(raw.description) : null,
    status: (raw.status ?? "TODO") as WorkTaskStatus,
    type: (raw.type ?? "TASK") as WorkTaskType,
    priority: (raw.priority ?? "MEDIUM") as WorkTaskPriority,
    assigneeUserId: toStringOrNull(raw.assigneeUserId ?? raw.assignee_user_id),
    reporterUserId: toStringOrNull(raw.reporterUserId ?? raw.reporter_user_id),
    startDate: toStringOrNull(raw.startDate ?? raw.start_date),
    dueDate: toStringOrNull(raw.dueDate ?? raw.due_date),
    completedAt: toStringOrNull(raw.completedAt ?? raw.completed_at),
    estimatePoints: raw.estimatePoints != null ? Number(raw.estimatePoints) : (raw.estimate_points != null ? Number(raw.estimate_points) : null),
    estimateHours: raw.estimateHours != null ? Number(raw.estimateHours) : (raw.estimate_hours != null ? Number(raw.estimate_hours) : null),
    remainingHours: raw.remainingHours != null ? Number(raw.remainingHours) : (raw.remaining_hours != null ? Number(raw.remaining_hours) : null),
    actualHours: raw.actualHours != null ? Number(raw.actualHours) : (raw.actual_hours != null ? Number(raw.actual_hours) : null),
    actualStartDate: toStringOrNull(raw.actualStartDate ?? raw.actual_start_date),
    actualEndDate: toStringOrNull(raw.actualEndDate ?? raw.actual_end_date),
    iterationId: toStringOrNull(raw.iterationId ?? raw.iteration_id),
    committed: Boolean(raw.committed ?? false),
    rank: raw.rank != null ? Number(raw.rank) : null,
    tags: Array.isArray(raw.tags) ? raw.tags : null,
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : null,
    acceptanceCriteria: Array.isArray(raw.acceptanceCriteria ?? raw.acceptance_criteria)
      ? (raw.acceptanceCriteria ?? raw.acceptance_criteria) as AcceptanceCriteriaItem[]
      : [],
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
    deletedAt: toStringOrNull(raw.deletedAt ?? raw.deleted_at),
    deletedByUserId: toStringOrNull(raw.deletedByUserId ?? raw.deleted_by_user_id),
  };
}

function normalizeTasks(items: unknown[]): WorkTask[] {
  return items.map((item) => normalizeTask(item as Record<string, unknown>));
}

// --- API functions ---

export async function listTasks(params: ListTasksParams): Promise<ListTasksResult> {
  requireActiveWorkspace();
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params.projectId) query.projectId = params.projectId;
  if (params.status) query.status = params.status;
  if (params.assigneeUserId) query.assigneeUserId = params.assigneeUserId;
  if (params.search) query.search = params.search;
  if (params.dueFrom) query.dueFrom = params.dueFrom;
  if (params.dueTo) query.dueTo = params.dueTo;
  if (params.includeStatuses) query.includeStatuses = params.includeStatuses;
  if (params.excludeStatuses) query.excludeStatuses = params.excludeStatuses;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;
  if (params.limit != null) query.limit = params.limit;
  if (params.offset != null) query.offset = params.offset;
  if (params.includeDeleted) query.includeDeleted = true;

  const data = await request.get<{ items?: unknown[]; total?: number }>("/work/tasks", { params: query });
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === "number" ? data.total : items.length;
  return { items: normalizeTasks(items), total };
}

export async function getTask(id: string): Promise<WorkTask> {
  requireActiveWorkspace();
  const data = await request.get<Record<string, unknown>>(`/work/tasks/${id}`);
  return normalizeTask(data);
}

export async function createTask(input: CreateTaskInput): Promise<WorkTask> {
  requireActiveWorkspace();
  const body = {
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    phaseId: input.phaseId,
    assigneeUserId: input.assigneeUserId,
    dueDate: input.dueDate,
    priority: input.priority,
    tags: input.tags,
  };
  const data = await request.post<Record<string, unknown>>("/work/tasks", body);
  return normalizeTask(data);
}

export async function updateTask(id: string, patch: UpdateTaskPatch): Promise<WorkTask> {
  requireActiveWorkspace();
  const data = await request.patch<Record<string, unknown>>(`/work/tasks/${id}`, patch);
  return normalizeTask(data);
}

export async function deleteTask(id: string): Promise<void> {
  requireActiveWorkspace();
  await request.delete(`/work/tasks/${id}`);
}

/**
 * Restore a soft-deleted task.
 * Returns the restored task.
 * @throws 404 TASK_NOT_FOUND if task doesn't exist or wrong workspace
 * @throws 400 TASK_NOT_DELETED if task is not deleted
 */
export async function restoreTask(id: string): Promise<WorkTask> {
  requireActiveWorkspace();
  const data = await request.post<Record<string, unknown>>(`/work/tasks/${id}/restore`);
  return normalizeTask(data);
}

export async function bulkUpdate(input: BulkUpdateInput): Promise<{ updated: number }> {
  requireActiveWorkspace();
  const data = await request.patch<{ updated?: number }>("/work/tasks/bulk", {
    taskIds: input.taskIds,
    status: input.status,
  });
  return { updated: typeof data?.updated === "number" ? data.updated : input.taskIds.length };
}

export async function listComments(
  taskId: string,
  limit?: number,
  offset?: number
): Promise<{ items: TaskComment[]; total: number }> {
  requireActiveWorkspace();
  const params: Record<string, number> = {};
  if (limit != null) params.limit = limit;
  if (offset != null) params.offset = offset;
  const data = await request.get<{ items?: unknown[]; total?: number }>(`/work/tasks/${taskId}/comments`, { params });
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === "number" ? data.total : items.length;
  return {
    items: items.map((c: unknown) => {
      const x = c as Record<string, unknown>;
      return {
        id: String(x.id),
        taskId: String(x.taskId ?? x.task_id),
        body: String(x.body ?? ""),
        authorUserId: String(x.authorUserId ?? x.author_user_id ?? ""),
        createdAt: String(x.createdAt ?? x.created_at ?? ""),
        updatedAt: String(x.updatedAt ?? x.updated_at ?? ""),
      };
    }) as TaskComment[],
    total,
  };
}

export async function addComment(taskId: string, body: string): Promise<TaskComment> {
  requireActiveWorkspace();
  const x = await request.post<Record<string, unknown>>(`/work/tasks/${taskId}/comments`, { body });
  return {
    id: String(x.id),
    taskId: String(x.taskId ?? x.task_id ?? taskId),
    body: String(x.body ?? body),
    authorUserId: String(x.authorUserId ?? x.author_user_id ?? ""),
    createdAt: String(x.createdAt ?? x.created_at ?? ""),
    updatedAt: String(x.updatedAt ?? x.updated_at ?? ""),
  };
}

export async function listActivity(
  taskId: string,
  limit?: number,
  offset?: number
): Promise<{ items: TaskActivityItem[]; total: number }> {
  requireActiveWorkspace();
  const params: Record<string, number> = {};
  if (limit != null) params.limit = limit;
  if (offset != null) params.offset = offset;
  const data = await request.get<{ items?: unknown[]; total?: number }>(`/work/tasks/${taskId}/activity`, { params });
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === "number" ? data.total : items.length;
  return {
    items: items.map((a: unknown) => {
      const x = a as Record<string, unknown>;
      return {
        id: String(x.id),
        taskId: String(x.taskId ?? x.task_id ?? taskId),
        type: String(x.type ?? ""),
        payload: (x.payload && typeof x.payload === "object" ? x.payload : {}) as Record<string, unknown>,
        userId: String(x.userId ?? x.user_id ?? ""),
        createdAt: String(x.createdAt ?? x.created_at ?? ""),
      };
    }) as TaskActivityItem[],
    total,
  };
}

export async function listDependencies(
  taskId: string,
): Promise<{ predecessors: TaskDependency[]; successors: TaskDependency[] }> {
  requireActiveWorkspace();
  const data = await request.get<{ predecessors?: unknown[]; successors?: unknown[] }>(`/work/tasks/${taskId}/dependencies`);
  const mapDep = (d: unknown): TaskDependency => {
    const x = d as Record<string, unknown>;
    return {
      id: String(x.id ?? ""),
      predecessorTaskId: String(x.predecessorTaskId ?? x.predecessor_task_id ?? ""),
      successorTaskId: String(x.successorTaskId ?? x.successor_task_id ?? ""),
      type: (x.type ?? "FINISH_TO_START") as DependencyType,
      predecessorTitle: String((x as any).predecessorTask?.title ?? ""),
      successorTitle: String((x as any).successorTask?.title ?? ""),
    };
  };
  return {
    predecessors: Array.isArray(data?.predecessors) ? data.predecessors.map(mapDep) : [],
    successors: Array.isArray(data?.successors) ? data.successors.map(mapDep) : [],
  };
}

export async function addDependency(
  taskId: string,
  predecessorTaskId: string,
  dependencyType: DependencyType
): Promise<TaskDependency> {
  requireActiveWorkspace();
  const x = await request.post<Record<string, unknown>>(`/work/tasks/${taskId}/dependencies`, {
    predecessorTaskId,
    type: dependencyType,
  });
  return {
    id: String(x.id),
    predecessorTaskId: String(x.predecessorTaskId ?? x.predecessor_task_id ?? predecessorTaskId),
    successorTaskId: String(x.successorTaskId ?? x.successor_task_id ?? taskId),
    type: (x.type ?? dependencyType) as DependencyType,
  };
}

export async function removeDependency(
  taskId: string,
  predecessorTaskId: string,
  dependencyType?: DependencyType
): Promise<void> {
  requireActiveWorkspace();
  const body: { predecessorTaskId: string; type?: DependencyType } = { predecessorTaskId };
  if (dependencyType) body.type = dependencyType;
  await request.delete(`/work/tasks/${taskId}/dependencies`, { data: body });
}

export async function updateComment(taskId: string, commentId: string, body: string): Promise<TaskComment> {
  requireActiveWorkspace();
  const x = await request.patch<Record<string, unknown>>(`/work/tasks/${taskId}/comments/${commentId}`, { body });
  return {
    id: String(x.id),
    taskId: String(x.taskId ?? x.task_id ?? taskId),
    body: String(x.body ?? body),
    authorUserId: String(x.authorUserId ?? x.author_user_id ?? ''),
    createdAt: String(x.createdAt ?? x.created_at ?? ''),
    updatedAt: String(x.updatedAt ?? x.updated_at ?? ''),
  };
}

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  requireActiveWorkspace();
  await request.delete(`/work/tasks/${taskId}/comments/${commentId}`);
}

// --- Phase API functions ---

/**
 * List deleted phases for a project.
 * Requires write access (admin/member only).
 */
export async function listDeletedPhases(projectId: string): Promise<DeletedPhase[]> {
  requireActiveWorkspace();
  const data = await request.get<{ items?: unknown[] }>("/work/phases", {
    params: { projectId, deletedOnly: true },
  });
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item) => normalizePhase(item as Record<string, unknown>));
}

/**
 * Soft-delete a phase.
 * Returns a success message.
 */
export async function deletePhase(phaseId: string): Promise<{ message: string }> {
  requireActiveWorkspace();
  const data = await request.delete<{ message?: string }>(`/work/phases/${phaseId}`);
  return { message: data?.message || "Phase deleted" };
}

/**
 * Restore a soft-deleted phase.
 * Returns the restored phase.
 * @throws 404 PHASE_NOT_FOUND if phase doesn't exist or wrong workspace
 * @throws 400 PHASE_NOT_DELETED if phase is not deleted
 */
export async function restorePhase(phaseId: string): Promise<DeletedPhase> {
  requireActiveWorkspace();
  const data = await request.post<Record<string, unknown>>(`/work/phases/${phaseId}/restore`);
  return normalizePhase(data);
}

/** Normalize backend response to DeletedPhase */
function normalizePhase(raw: Record<string, unknown>): DeletedPhase {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : (typeof raw.sort_order === "number" ? raw.sort_order : 0),
    reportingKey: String(raw.reportingKey ?? raw.reporting_key ?? ""),
    isMilestone: Boolean(raw.isMilestone ?? raw.is_milestone ?? false),
    isLocked: Boolean(raw.isLocked ?? raw.is_locked ?? false),
    dueDate: toStringOrNull(raw.dueDate ?? raw.due_date),
    deletedAt: toStringOrNull(raw.deletedAt ?? raw.deleted_at),
    deletedByUserId: toStringOrNull(raw.deletedByUserId ?? raw.deleted_by_user_id),
  };
}

// --- Phase create/update/reorder API functions ---

export interface CreatePhaseInput {
  projectId: string;
  name: string;
  dueDate?: string;
  isMilestone?: boolean;
}

export interface WorkPhaseResponse {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  isLocked: boolean;
  dueDate: string | null;
}

/**
 * Create a new phase.
 */
export async function createPhase(input: CreatePhaseInput): Promise<WorkPhaseResponse> {
  requireActiveWorkspace();
  const raw = await request.post<Record<string, unknown>>("/work/phases", input);
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : (typeof raw.sort_order === "number" ? raw.sort_order : 0),
    reportingKey: String(raw.reportingKey ?? raw.reporting_key ?? ""),
    isMilestone: Boolean(raw.isMilestone ?? raw.is_milestone ?? false),
    isLocked: Boolean(raw.isLocked ?? raw.is_locked ?? false),
    dueDate: (raw.dueDate ?? raw.due_date ?? null) as string | null,
  };
}

export interface UpdatePhaseInput {
  name?: string;
  dueDate?: string | null;
}

/**
 * Update a phase (name or dueDate).
 * May return ACK_REQUIRED for milestone phase edits after project start.
 */
export async function updatePhase(
  phaseId: string,
  patch: UpdatePhaseInput,
  ackToken?: string
): Promise<WorkPhaseResponse | { code: string; ack: unknown }> {
  requireActiveWorkspace();
  const headers: Record<string, string> = {};
  if (ackToken) {
    headers["x-ack-token"] = ackToken;
  }
  const raw = await request.patch<Record<string, unknown>>(`/work/phases/${phaseId}`, patch, { headers });
  
  // Check for ACK_REQUIRED response
  if (raw.code === "ACK_REQUIRED") {
    return { code: "ACK_REQUIRED", ack: raw.ack };
  }
  
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : (typeof raw.sort_order === "number" ? raw.sort_order : 0),
    reportingKey: String(raw.reportingKey ?? raw.reporting_key ?? ""),
    isMilestone: Boolean(raw.isMilestone ?? raw.is_milestone ?? false),
    isLocked: Boolean(raw.isLocked ?? raw.is_locked ?? false),
    dueDate: (raw.dueDate ?? raw.due_date ?? null) as string | null,
  };
}

/**
 * Reorder phases by providing an ordered array of phase IDs.
 * Only allowed before project is ACTIVE.
 */
export async function reorderPhases(
  projectId: string,
  orderedPhaseIds: string[]
): Promise<{ message: string }> {
  requireActiveWorkspace();
  const data = await request.post<{ message?: string }>("/work/phases/reorder", {
    projectId,
    orderedPhaseIds,
  });
  return { message: data?.message || "Phases reordered" };
}

// ── Workflow Config (WIP Limits) ──────────────────────────────────────

export interface EffectiveLimits {
  defaultWipLimit: number | null;
  statusWipLimits: Record<string, number> | null;
  derivedEffectiveLimit: Record<string, number | null>;
}

export async function getWorkflowConfig(
  projectId: string
): Promise<EffectiveLimits> {
  requireActiveWorkspace();
  const data = await request.get<EffectiveLimits>(
    `/work/projects/${projectId}/workflow-config`
  );
  return data as unknown as EffectiveLimits;
}
