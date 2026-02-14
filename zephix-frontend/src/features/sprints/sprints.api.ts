// ─────────────────────────────────────────────────────────────────────────────
// Sprints API Client — Phase 4.6
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  startedAt: string | null;
  completedAt: string | null;
  capacityHours: number | null;
  plannedPoints: number | null;
  committedPoints: number | null;
  committedHours: number | null;
  completedPoints: number | null;
  completedHours: number | null;
  createdAt: string;
}

export interface VelocityResult {
  iterations: Array<{
    iterationId: string;
    name: string;
    completedPoints: number;
    actualHours: number;
  }>;
  rollingAveragePoints: number;
  rollingAverageHours: number;
  /** @deprecated alias for iterations */
  sprints?: Array<{
    id: string;
    name: string;
    committedPoints: number;
    completedPoints: number;
  }>;
  /** @deprecated alias for rollingAveragePoints */
  rollingAverage?: number;
}

export interface CapacityResult {
  sprintId: string;
  committedPoints: number;
  completedPoints: number;
  remainingPoints: number;
  committedHours: number;
  actualHours: number;
  remainingHours: number;
  capacityHours: number | null;
  taskCount: number;
  doneTaskCount: number;
  basis: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function listSprints(projectId: string): Promise<Sprint[]> {
  const res = await apiClient.get(
    `/work/projects/${projectId}/sprints`,
  );
  return unwrap<Sprint[]>(res);
}

export async function getSprint(sprintId: string): Promise<Sprint> {
  const res = await apiClient.get(`/work/sprints/${sprintId}`);
  return unwrap<Sprint>(res);
}

export async function createSprint(
  projectId: string,
  data: { name: string; goal?: string; startDate?: string; endDate?: string },
): Promise<Sprint> {
  const res = await apiClient.post(
    `/work/projects/${projectId}/sprints`,
    { ...data, projectId },
  );
  return unwrap<Sprint>(res);
}

export async function updateSprint(
  sprintId: string,
  data: Partial<{ name: string; goal: string; startDate: string; endDate: string }>,
): Promise<Sprint> {
  const res = await apiClient.patch(`/work/sprints/${sprintId}`, data);
  return unwrap<Sprint>(res);
}

export async function startSprint(sprintId: string): Promise<Sprint> {
  const res = await apiClient.post(`/work/sprints/${sprintId}/start`);
  return unwrap<Sprint>(res);
}

export async function completeSprint(sprintId: string): Promise<Sprint> {
  const res = await apiClient.post(`/work/sprints/${sprintId}/complete`);
  return unwrap<Sprint>(res);
}

export async function cancelSprint(sprintId: string): Promise<Sprint> {
  const res = await apiClient.post(`/work/sprints/${sprintId}/cancel`);
  return unwrap<Sprint>(res);
}

export async function addTaskToSprint(
  sprintId: string,
  taskId: string,
): Promise<any> {
  const res = await apiClient.post(
    `/work/sprints/${sprintId}/tasks/${taskId}`,
  );
  return unwrap(res);
}

export async function removeTaskFromSprint(
  sprintId: string,
  taskId: string,
): Promise<any> {
  const res = await apiClient.delete(
    `/work/sprints/${sprintId}/tasks/${taskId}`,
  );
  return unwrap(res);
}

export async function getVelocity(
  projectId: string,
  lookback?: number,
): Promise<VelocityResult> {
  const params: Record<string, string> = {};
  if (lookback) params.lookback = String(lookback);
  const res = await apiClient.get(
    `/work/projects/${projectId}/velocity`,
    { params },
  );
  return unwrap<VelocityResult>(res);
}

export async function getCapacity(sprintId: string): Promise<CapacityResult> {
  const res = await apiClient.get(`/work/sprints/${sprintId}/capacity`);
  return unwrap<CapacityResult>(res);
}
