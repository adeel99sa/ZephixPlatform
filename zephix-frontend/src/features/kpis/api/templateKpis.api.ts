/**
 * Template KPIs API
 * Admin endpoints for managing KPI bindings on templates.
 */
import { request } from '@/lib/api';
import type { KpiDefinition } from './kpiDefinitions.api';

export interface TemplateKpi {
  id: string;
  templateId: string;
  kpiDefinitionId: string;
  isRequired: boolean;
  defaultTarget: string | null;
  kpiDefinition?: KpiDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface AssignKpiInput {
  kpiDefinitionId: string;
  isRequired?: boolean;
  defaultTarget?: string;
}

/**
 * GET /api/admin/templates/:templateId/kpis
 */
export async function listTemplateKpis(templateId: string): Promise<TemplateKpi[]> {
  const data = await request.get<TemplateKpi[]>(
    `/admin/templates/${templateId}/kpis`,
  );
  return Array.isArray(data) ? data : [];
}

/**
 * POST /api/admin/templates/:templateId/kpis
 */
export async function assignTemplateKpi(
  templateId: string,
  input: AssignKpiInput,
): Promise<TemplateKpi> {
  return request.post<TemplateKpi>(
    `/admin/templates/${templateId}/kpis`,
    input,
  );
}

/**
 * DELETE /api/admin/templates/:templateId/kpis/:kpiDefinitionId
 */
export async function removeTemplateKpi(
  templateId: string,
  kpiDefinitionId: string,
): Promise<void> {
  await request.delete(
    `/admin/templates/${templateId}/kpis/${kpiDefinitionId}`,
  );
}

// ── Wave 4D: KPI Packs ─────────────────────────────────────────────

export interface KpiPackMeta {
  packCode: string;
  name: string;
  description: string;
  kpiCount: number;
}

/**
 * GET /api/admin/templates/:templateId/kpis/packs
 */
export async function listKpiPacks(templateId: string): Promise<KpiPackMeta[]> {
  const data = await request.get<KpiPackMeta[]>(
    `/admin/templates/${templateId}/kpis/packs`,
  );
  return Array.isArray(data) ? data : [];
}

/**
 * POST /api/admin/templates/:templateId/kpis/packs/:packCode/apply
 */
export async function applyKpiPack(
  templateId: string,
  packCode: string,
): Promise<TemplateKpi[]> {
  const data = await request.post<TemplateKpi[]>(
    `/admin/templates/${templateId}/kpis/packs/${packCode}/apply`,
  );
  return Array.isArray(data) ? data : [];
}
