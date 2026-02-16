/**
 * KPI Definitions API
 * Global endpoint for listing KPI definitions (admin + project selection).
 */
import { request } from '@/lib/api';

export interface KpiDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  unit: string | null;
  lifecyclePhase: string;
  formulaType: string;
  dataSources: string[];
  requiredGovernanceFlag: string | null;
  isLeading: boolean;
  isLagging: boolean;
  defaultEnabled: boolean;
  calculationStrategy: string;
  isSystem: boolean;
  organizationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/kpis/definitions
 * Returns all active KPI definitions scoped to the current org.
 */
export async function listKpiDefinitions(): Promise<KpiDefinition[]> {
  const data = await request.get<KpiDefinition[]>('/kpis/definitions');
  return Array.isArray(data) ? data : [];
}
