/**
 * Project KPIs API
 * Endpoints for project-level KPI configuration, computation, and values.
 */
import { request } from '@/lib/api';
import type { KpiDefinition } from './kpiDefinitions.api';

export interface ProjectKpiConfig {
  id: string;
  workspaceId: string;
  projectId: string;
  kpiDefinitionId: string;
  enabled: boolean;
  thresholdWarning: Record<string, any> | null;
  thresholdCritical: Record<string, any> | null;
  target: Record<string, any> | null;
  kpiDefinition?: KpiDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectKpiValue {
  id: string;
  workspaceId: string;
  projectId: string;
  kpiDefinitionId: string;
  asOfDate: string;
  valueNumeric: string | null;
  valueText: string | null;
  valueJson: Record<string, any> | null;
  sampleSize: number | null;
  computedAt: string;
}

export interface SkippedKpi {
  kpiCode: string;
  kpiName: string;
  reason: string;
  governanceFlag: string;
}

export interface ComputeResult {
  computed: ProjectKpiValue[];
  skipped: SkippedKpi[];
}

function basePath(workspaceId: string, projectId: string) {
  return `/work/workspaces/${workspaceId}/projects/${projectId}/kpis`;
}

/**
 * GET /api/work/workspaces/:wsId/projects/:projId/kpis/config
 */
export async function getProjectKpiConfigs(
  workspaceId: string,
  projectId: string,
): Promise<ProjectKpiConfig[]> {
  const data = await request.get<ProjectKpiConfig[]>(
    `${basePath(workspaceId, projectId)}/config`,
  );
  return Array.isArray(data) ? data : [];
}

/**
 * PATCH /api/work/workspaces/:wsId/projects/:projId/kpis/configs/:kpiDefinitionId
 */
export async function updateProjectKpiConfig(
  workspaceId: string,
  projectId: string,
  kpiDefinitionId: string,
  input: { enabled?: boolean; targetValue?: string; thresholdsJson?: Record<string, any> },
): Promise<ProjectKpiConfig> {
  return request.patch<ProjectKpiConfig>(
    `${basePath(workspaceId, projectId)}/configs/${kpiDefinitionId}`,
    input,
  );
}

/**
 * GET /api/work/workspaces/:wsId/projects/:projId/kpis/values
 */
export async function getProjectKpiValues(
  workspaceId: string,
  projectId: string,
  from?: string,
  to?: string,
): Promise<ProjectKpiValue[]> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const data = await request.get<ProjectKpiValue[]>(
    `${basePath(workspaceId, projectId)}/values`,
    { params },
  );
  return Array.isArray(data) ? data : [];
}

/**
 * POST /api/work/workspaces/:wsId/projects/:projId/kpis/compute
 */
export async function computeProjectKpis(
  workspaceId: string,
  projectId: string,
): Promise<ComputeResult> {
  return request.post<ComputeResult>(
    `${basePath(workspaceId, projectId)}/compute`,
  );
}
