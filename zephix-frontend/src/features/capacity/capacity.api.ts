/**
 * Phase 2E: Capacity Engine API Client
 *
 * All calls scoped to active workspace via x-workspace-id interceptor.
 * Thresholds come from backend — no duplication.
 */

import { request } from "@/lib/api";
import { useWorkspaceStore } from "@/state/workspace.store";

function requireWorkspace(): string {
  const ws = useWorkspaceStore.getState().activeWorkspace;
  if (!ws?.id) throw new Error("No active workspace");
  return ws.id;
}

// ── Types ────────────────────────────────────────────────────────────

export interface CapacityDay {
  date: string;
  capacityHours: number;
}

export interface UserCapacity {
  userId: string;
  days: CapacityDay[];
}

export interface UserDailyUtilization {
  userId: string;
  date: string;
  capacityHours: number;
  demandHours: number;
  utilization: number;
  overByHours: number;
}

export interface UserWeeklyRollup {
  userId: string;
  weekStartDate: string;
  totalCapacityHours: number;
  totalDemandHours: number;
  averageUtilization: number;
  peakDayUtilization: number;
  overallocatedDays: number;
}

export interface UtilizationResult {
  perUserDaily: UserDailyUtilization[];
  perUserWeekly: UserWeeklyRollup[];
  workspaceSummary: {
    totalCapacityHours: number;
    totalDemandHours: number;
    averageUtilization: number;
    overallocatedUserCount: number;
  };
}

export interface OverallocationTask {
  taskId?: string;
  projectId: string;
  demandHours: number;
  source: string;
}

export interface OverallocationEntry {
  userId: string;
  date: string;
  capacityHours: number;
  demandHours: number;
  overByHours: number;
  tasks: OverallocationTask[];
}

export interface OverallocationResult {
  entries: OverallocationEntry[];
  totalOverallocatedDays: number;
  affectedUserCount: number;
}

export interface LevelingRecommendation {
  taskId: string;
  taskTitle: string;
  projectId: string;
  userId: string;
  currentStartDate: string;
  recommendedStartDate: string;
  shiftDays: number;
  reason: string;
  isCriticalPath: boolean;
  totalFloatMinutes: number | null;
}

export interface LevelingResult {
  recommendations: LevelingRecommendation[];
  resolvedOverloadDays: number;
  remainingOverloadDays: number;
}

// ── API Functions ────────────────────────────────────────────────────

export async function getCapacity(
  from: string,
  to: string,
  userIds?: string[],
): Promise<UserCapacity[]> {
  const wsId = requireWorkspace();
  const params = new URLSearchParams({ from, to });
  if (userIds?.length) params.set("userIds", userIds.join(","));
  const res = await request.get(
    `/work/workspaces/${wsId}/capacity?${params}`,
  );
  return res.data?.data ?? res.data ?? [];
}

export async function setCapacity(
  userId: string,
  date: string,
  capacityHours: number,
): Promise<void> {
  const wsId = requireWorkspace();
  await request.put(
    `/work/workspaces/${wsId}/capacity/${userId}/${date}`,
    { capacityHours },
  );
}

export async function getUtilization(
  from: string,
  to: string,
  opts?: { userIds?: string[]; threshold?: number },
): Promise<UtilizationResult> {
  const wsId = requireWorkspace();
  const params = new URLSearchParams({ from, to });
  if (opts?.userIds?.length) params.set("userIds", opts.userIds.join(","));
  if (opts?.threshold != null)
    params.set("threshold", String(opts.threshold));
  const res = await request.get(
    `/work/workspaces/${wsId}/capacity/utilization?${params}`,
  );
  return res.data?.data ?? res.data;
}

export async function getOverallocations(
  from: string,
  to: string,
  opts?: { userIds?: string[]; threshold?: number },
): Promise<OverallocationResult> {
  const wsId = requireWorkspace();
  const params = new URLSearchParams({ from, to });
  if (opts?.userIds?.length) params.set("userIds", opts.userIds.join(","));
  if (opts?.threshold != null)
    params.set("threshold", String(opts.threshold));
  const res = await request.get(
    `/work/workspaces/${wsId}/capacity/overallocations?${params}`,
  );
  return res.data?.data ?? res.data;
}

export async function getRecommendations(
  from: string,
  to: string,
  opts?: { projectId?: string; threshold?: number },
): Promise<LevelingResult> {
  const wsId = requireWorkspace();
  const params = new URLSearchParams({ from, to });
  if (opts?.projectId) params.set("projectId", opts.projectId);
  if (opts?.threshold != null)
    params.set("threshold", String(opts.threshold));
  const res = await request.get(
    `/work/workspaces/${wsId}/capacity/leveling/recommendations?${params}`,
  );
  return res.data?.data ?? res.data;
}
