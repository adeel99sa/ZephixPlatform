/**
 * Sprints API – CRUD + task assignment for project sprints.
 * All calls use request from @/lib/api (x-workspace-id set by interceptor).
 */

import { request } from "@/lib/api";
import { useWorkspaceStore } from "@/state/workspace.store";

function requireActiveWorkspace(): void {
  const ws = useWorkspaceStore.getState().activeWorkspaceId;
  if (!ws) throw new Error("No active workspace");
}

// --- Types ---

export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Sprint {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    committed: number;
    completed: number;
    remaining: number;
    taskCount: number;
  };
}

export interface CreateSprintInput {
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
}

// --- API functions ---

/** List all sprints for a project (newest first). */
export async function listSprints(projectId: string): Promise<Sprint[]> {
  requireActiveWorkspace();
  const resp = await request.get<any>(`/work/sprints/project/${projectId}`);
  const items = resp?.data ?? resp;
  return Array.isArray(items) ? items : [];
}

/** Get a single sprint with stats. */
export async function getSprint(sprintId: string): Promise<Sprint> {
  requireActiveWorkspace();
  const resp = await request.get<any>(`/work/sprints/${sprintId}`);
  return resp?.data ?? resp;
}

/** Create a new sprint. */
export async function createSprint(input: CreateSprintInput): Promise<Sprint> {
  requireActiveWorkspace();
  const resp = await request.post<any>("/work/sprints", input);
  return resp?.data ?? resp;
}

/** Update a sprint. */
export async function updateSprint(
  sprintId: string,
  patch: UpdateSprintInput,
): Promise<Sprint> {
  requireActiveWorkspace();
  const resp = await request.patch<any>(`/work/sprints/${sprintId}`, patch);
  return resp?.data ?? resp;
}

/** Delete a sprint (PLANNING only). */
export async function deleteSprint(sprintId: string): Promise<void> {
  requireActiveWorkspace();
  await request.delete(`/work/sprints/${sprintId}`);
}

/** Assign tasks to a sprint. */
export async function assignTasksToSprint(
  sprintId: string,
  taskIds: string[],
): Promise<{ assigned: number }> {
  requireActiveWorkspace();
  const resp = await request.post<any>(`/work/sprints/${sprintId}/tasks`, {
    taskIds,
  });
  return resp?.data ?? resp;
}

/** Remove tasks from a sprint. */
export async function removeTasksFromSprint(
  sprintId: string,
  taskIds: string[],
): Promise<{ removed: number }> {
  requireActiveWorkspace();
  const resp = await request.delete<any>(`/work/sprints/${sprintId}/tasks`, {
    data: { taskIds },
  });
  return resp?.data ?? resp;
}

// --- Sprint Capacity ---

export interface SprintCapacity {
  capacityHours: number;
  loadHours: number;
  remainingHours: number;
  committedStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  capacityBasis: {
    hoursPerDay: number;
    workdays: number;
    pointsToHoursRatio: number;
    allocationCount: number;
    allocationSource: "allocations" | "none";
    loadSource: "estimates" | "storyPoints";
  };
}

/** Get read-only computed capacity for a sprint. */
export async function getSprintCapacity(
  sprintId: string,
): Promise<SprintCapacity> {
  requireActiveWorkspace();
  const resp = await request.get<any>(`/work/sprints/${sprintId}/capacity`);
  return resp?.data ?? resp;
}

// --- Velocity ---

export interface VelocitySprint {
  sprintId: string;
  name: string;
  startDate: string;
  endDate: string;
  committedStoryPoints: number;
  completedStoryPoints: number;
}

export interface VelocityData {
  window: number;
  sprints: VelocitySprint[];
  rollingAverageCompletedPoints: number;
}

/** Get velocity data for a project from completed sprints. */
export async function getProjectVelocity(
  projectId: string,
  window: number = 5,
): Promise<VelocityData> {
  requireActiveWorkspace();
  const resp = await request.get<any>(
    `/work/sprints/project/${projectId}/velocity?window=${window}`,
  );
  return resp?.data ?? resp;
}
