/**
 * Phase 2F: What-If Scenario API Client
 */
import { request } from "@/lib/api";
import { useWorkspaceStore } from "@/state/workspace.store";

function requireWorkspace(): string {
  const ws = useWorkspaceStore.getState().activeWorkspace;
  if (!ws?.id) throw new Error("No active workspace");
  return ws.id;
}

// ── Types ────────────────────────────────────────────────────────────

export type ScenarioScopeType = "portfolio" | "project";
export type ScenarioStatus = "draft" | "active";
export type ScenarioActionType =
  | "shift_project"
  | "shift_task"
  | "change_capacity"
  | "change_budget";

export interface ScenarioPlan {
  id: string;
  name: string;
  description: string | null;
  scopeType: ScenarioScopeType;
  scopeId: string;
  status: ScenarioStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  actions?: ScenarioAction[];
  result?: ScenarioResult;
}

export interface ScenarioAction {
  id: string;
  scenarioId: string;
  actionType: ScenarioActionType;
  payload: Record<string, any>;
  createdAt: string;
}

export interface ScenarioStateSnapshot {
  totalCapacityHours: number;
  totalDemandHours: number;
  overallocatedDays: number;
  overallocatedUsers: number;
  aggregateCPI: number | null;
  aggregateSPI: number | null;
  criticalPathSlipMinutes: number;
  baselineDriftMinutes: number;
}

export interface ScenarioDeltas {
  overallocatedDaysDelta: number;
  overallocatedUsersDelta: number;
  cpiDelta: number | null;
  spiDelta: number | null;
  criticalPathSlipDelta: number;
  baselineDriftDelta: number;
}

export interface ScenarioSummary {
  before: ScenarioStateSnapshot;
  after: ScenarioStateSnapshot;
  deltas: ScenarioDeltas;
  impactedProjects: Array<{
    projectId: string;
    projectName: string;
    impactSummary: string;
  }>;
}

export interface ScenarioResult {
  id: string;
  scenarioId: string;
  computedAt: string;
  summary: ScenarioSummary;
  warnings: string[];
}

export interface ComputeResponse {
  summary: ScenarioSummary;
  warnings: string[];
}

// ── API Functions ────────────────────────────────────────────────────

export async function listScenarios(): Promise<ScenarioPlan[]> {
  const wsId = requireWorkspace();
  const res = await request.get(`/work/workspaces/${wsId}/scenarios`);
  return res.data?.data ?? res.data ?? [];
}

export async function createScenario(data: {
  name: string;
  description?: string;
  scopeType: ScenarioScopeType;
  scopeId: string;
}): Promise<ScenarioPlan> {
  const wsId = requireWorkspace();
  const res = await request.post(`/work/workspaces/${wsId}/scenarios`, data);
  return res.data?.data ?? res.data;
}

export async function getScenario(id: string): Promise<ScenarioPlan> {
  const res = await request.get(`/work/scenarios/${id}`);
  return res.data?.data ?? res.data;
}

export async function updateScenario(
  id: string,
  data: { name?: string; description?: string; status?: ScenarioStatus },
): Promise<ScenarioPlan> {
  const res = await request.patch(`/work/scenarios/${id}`, data);
  return res.data?.data ?? res.data;
}

export async function deleteScenario(id: string): Promise<void> {
  await request.delete(`/work/scenarios/${id}`);
}

export async function addAction(
  scenarioId: string,
  actionType: ScenarioActionType,
  payload: Record<string, any>,
): Promise<ScenarioAction> {
  const res = await request.post(`/work/scenarios/${scenarioId}/actions`, {
    actionType,
    payload,
  });
  return res.data?.data ?? res.data;
}

export async function removeAction(
  scenarioId: string,
  actionId: string,
): Promise<void> {
  await request.delete(`/work/scenarios/${scenarioId}/actions/${actionId}`);
}

export async function computeScenario(
  scenarioId: string,
): Promise<ComputeResponse> {
  const res = await request.post(`/work/scenarios/${scenarioId}/compute`);
  return res.data?.data ?? res.data;
}
