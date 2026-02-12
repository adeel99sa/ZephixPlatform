/**
 * Policies & Governance API client
 */
import { request } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

export type PolicyCategory = 'GOVERNANCE' | 'RISK' | 'RESOURCES' | 'BUDGET' | 'QUALITY';
export type PolicyValueType = 'BOOLEAN' | 'NUMBER' | 'STRING' | 'JSON';
export type PolicyScope = 'ORG' | 'WORKSPACE';

export interface PolicyDefinition {
  id: string;
  key: string;
  category: PolicyCategory;
  description: string;
  valueType: PolicyValueType;
  defaultValue: unknown;
  metadata: { min?: number; max?: number; options?: string[] } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyOverride {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  key: string;
  value: unknown;
  scope: PolicyScope;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyResolution {
  key: string;
  resolvedValue: unknown;
  source: 'SYSTEM' | 'ORG' | 'WORKSPACE';
  definition: PolicyDefinition;
}

// ─── API functions ──────────────────────────────────────────

export async function listPolicyDefinitions(): Promise<PolicyDefinition[]> {
  const res = await request('GET', '/policies/definitions');
  return res.data ?? res;
}

export async function getResolvedPolicies(workspaceId?: string): Promise<PolicyResolution[]> {
  const qs = workspaceId ? `?workspaceId=${workspaceId}` : '';
  const res = await request('GET', `/policies/resolved${qs}`);
  return res.data ?? res;
}

export async function listOrgOverrides(): Promise<PolicyOverride[]> {
  const res = await request('GET', '/policies/overrides/org');
  return res.data ?? res;
}

export async function listWorkspaceOverrides(workspaceId: string): Promise<PolicyOverride[]> {
  const res = await request('GET', `/policies/overrides/workspace/${workspaceId}`);
  return res.data ?? res;
}

export async function upsertOrgOverride(
  key: string,
  value: unknown,
): Promise<PolicyOverride> {
  const res = await request('PUT', '/policies/overrides/org', { key, value });
  return res.data ?? res;
}

export async function upsertWorkspaceOverride(
  workspaceId: string,
  key: string,
  value: unknown,
): Promise<PolicyOverride> {
  const res = await request('PUT', `/policies/overrides/workspace/${workspaceId}`, { key, value });
  return res.data ?? res;
}
