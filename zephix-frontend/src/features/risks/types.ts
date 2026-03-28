/**
 * Risk Types - Single source of truth for risk type definitions.
 */

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskStatus = 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';

export interface Risk {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  severity: RiskSeverity;
  status: RiskStatus;
  probability: number;
  impact: number;
  exposure: number;
  mitigationPlan: string | null;
  ownerUserId: string | null;
  dueDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateRiskInput {
  projectId: string;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  status?: RiskStatus;
  probability?: number;
  impact?: number;
  mitigationPlan?: string;
  ownerUserId?: string;
  dueDate?: string;
}

export interface UpdateRiskInput {
  title?: string;
  description?: string;
  severity?: RiskSeverity;
  status?: RiskStatus;
  probability?: number;
  impact?: number;
  mitigationPlan?: string;
  ownerUserId?: string;
  dueDate?: string;
}

export interface ListRisksParams {
  projectId: string;
  severity?: RiskSeverity;
  status?: RiskStatus;
}

export interface ListRisksResponse {
  items: Risk[];
  total: number;
}

/**
 * Severity display configuration
 */
export const SEVERITY_CONFIG: Record<RiskSeverity, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  HIGH: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  CRITICAL: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Status display configuration
 */
export const STATUS_CONFIG: Record<RiskStatus, { label: string; color: string; bgColor: string }> = {
  OPEN: { label: 'Open', color: 'text-red-700', bgColor: 'bg-red-100' },
  MITIGATED: { label: 'Mitigated', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ACCEPTED: { label: 'Accepted', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  CLOSED: { label: 'Closed', color: 'text-green-700', bgColor: 'bg-green-100' },
};
