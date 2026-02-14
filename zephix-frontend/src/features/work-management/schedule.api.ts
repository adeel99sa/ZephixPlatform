/**
 * Phase 2B: Waterfall Core — Schedule, Baselines, Earned Value API
 */
import { request } from '@/lib/api';

// ── Schedule endpoints ────────────────────────────────────────────────

export interface ScheduleTask {
  id: string;
  title: string;
  phaseId: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  percentComplete: number;
  isMilestone: boolean;
  constraintType: string;
  wbsCode: string | null;
  isCritical: boolean | null;
  totalFloatMinutes: number | null;
}

export interface ScheduleDependency {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: string;
  lagMinutes: number;
}

export interface ScheduleResponse {
  tasks: ScheduleTask[];
  dependencies: ScheduleDependency[];
  criticalPathTaskIds: string[];
  projectFinishMinutes: number | null;
}

export async function getProjectSchedule(
  projectId: string,
  opts: { mode?: 'planned' | 'actual'; includeCritical?: boolean } = {},
): Promise<ScheduleResponse> {
  const params = new URLSearchParams();
  if (opts.mode) params.set('mode', opts.mode);
  if (opts.includeCritical) params.set('includeCritical', 'true');
  const res = await request.get<any>(`/work/projects/${projectId}/schedule?${params}`);
  return res.data || res;
}

export interface PatchScheduleBody {
  plannedStartAt?: string;
  plannedEndAt?: string;
  percentComplete?: number;
  isMilestone?: boolean;
  constraintType?: string;
  constraintDate?: string;
  cascade?: 'none' | 'forward';
}

export interface RescheduleResult {
  updatedTaskId: string;
  cascadedTaskIds: string[];
  violations: string[];
}

export async function patchTaskSchedule(
  projectId: string,
  taskId: string,
  body: PatchScheduleBody,
): Promise<RescheduleResult> {
  const res = await request.patch<any>(`/work/projects/${projectId}/tasks/${taskId}/schedule`, body);
  return res.data || res;
}

export interface CriticalPathNode {
  taskId: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloatMinutes: number;
  isCritical: boolean;
  durationMinutes: number;
}

export interface CriticalPathResponse {
  nodes: CriticalPathNode[];
  criticalPathTaskIds: string[];
  projectFinishMinutes: number;
  longestPathDurationMinutes: number;
}

export async function getCriticalPath(
  projectId: string,
  mode: 'planned' | 'actual' = 'planned',
): Promise<CriticalPathResponse> {
  const res = await request.get<any>(`/work/projects/${projectId}/critical-path?mode=${mode}`);
  return res.data || res;
}

// ── Baseline endpoints ────────────────────────────────────────────────

export interface Baseline {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  locked: boolean;
  isActive: boolean;
}

export interface BaselineCompareItem {
  taskId: string;
  taskTitle: string;
  baselineStart: string | null;
  baselineEnd: string | null;
  currentStart: string | null;
  currentEnd: string | null;
  startVarianceMinutes: number;
  endVarianceMinutes: number;
  durationVarianceMinutes: number;
  isCriticalInBaseline: boolean;
}

export interface BaselineCompareResult {
  baselineId: string;
  baselineName: string;
  projectSummary: {
    countLate: number;
    maxSlipMinutes: number;
    criticalPathSlipMinutes: number;
  };
  items: BaselineCompareItem[];
}

export async function createBaseline(
  projectId: string,
  body: { name: string; description?: string; setActive?: boolean },
): Promise<Baseline> {
  const res = await request.post<any>(`/work/projects/${projectId}/baselines`, body);
  return res.data || res;
}

export async function listBaselines(projectId: string): Promise<Baseline[]> {
  const res = await request.get<any>(`/work/projects/${projectId}/baselines`);
  return res.data || res;
}

export async function activateBaseline(baselineId: string): Promise<void> {
  await request.post(`/work/baselines/${baselineId}/activate`);
}

export async function compareBaseline(
  baselineId: string,
  asOfDate?: string,
): Promise<BaselineCompareResult> {
  const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
  const res = await request.get<any>(`/work/baselines/${baselineId}/compare${params}`);
  return res.data || res;
}

// ── Earned Value endpoints ────────────────────────────────────────────

export interface EarnedValueData {
  snapshotId: string | null;
  asOfDate: string;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
}

export interface EVSnapshot {
  id: string;
  projectId: string;
  asOfDate: string;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
  bac: number | null;
  createdAt: string;
}

export async function getEarnedValue(
  projectId: string,
  asOfDate: string,
  baselineId?: string,
): Promise<EarnedValueData> {
  const params = new URLSearchParams({ asOfDate });
  if (baselineId) params.set('baselineId', baselineId);
  const res = await request.get<any>(`/work/projects/${projectId}/earned-value?${params}`);
  return res.data || res;
}

export async function createEVSnapshot(
  projectId: string,
  body: { asOfDate: string; baselineId?: string },
): Promise<EVSnapshot> {
  const res = await request.post<any>(`/work/projects/${projectId}/earned-value/snapshot`, body);
  return res.data || res;
}

export async function getEVHistory(
  projectId: string,
  from?: string,
  to?: string,
): Promise<EVSnapshot[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await request.get<any>(`/work/projects/${projectId}/earned-value/history?${params}`);
  return res.data || res;
}
