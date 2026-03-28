// ─────────────────────────────────────────────────────────────────────────────
// Tailoring API Client — Phase 4.5
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TailoringProfileFields {
  changeControlMode: 'OFF' | 'LIGHT' | 'STRICT';
  governanceMode: 'LIGHT' | 'STANDARD' | 'STRICT';
  reportingCadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  riskManagementMode: 'BASIC' | 'STANDARD' | 'STRICT';
  phaseGateMode: 'OFF' | 'SOFT' | 'HARD';
  wipMode: 'OFF' | 'DEFAULT_LIMITS' | 'STRICT_LIMITS';
}

export interface TailoringProfile {
  deliveryApproach: 'PREDICTIVE' | 'ADAPTIVE' | 'HYBRID';
  profile: TailoringProfileFields;
}

export interface TailoringResolveResult extends TailoringProfile {
  source: 'PROJECT' | 'WORKSPACE' | 'ORG' | 'SYSTEM';
  derivedPolicyOverrides: Array<{ policyKey: string; value: unknown }>;
}

export interface TailoringDefinitions {
  deliveryApproach: string[];
  profileKeys: Record<string, string[]>;
  systemDefault: TailoringProfile;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getTailoringDefinitions(): Promise<TailoringDefinitions> {
  const res = await apiClient.get('/tailoring/definitions');
  return unwrap<TailoringDefinitions>(res);
}

export async function resolveTailoring(
  workspaceId: string,
  projectId?: string,
): Promise<TailoringResolveResult> {
  const params: Record<string, string> = { workspaceId };
  if (projectId) params.projectId = projectId;
  const res = await apiClient.get('/tailoring/resolve', { params });
  return unwrap<TailoringResolveResult>(res);
}

export async function upsertOrgTailoring(
  payload: TailoringProfile,
): Promise<any> {
  const res = await apiClient.put('/tailoring/org', payload);
  return unwrap(res);
}

export async function upsertWorkspaceTailoring(
  workspaceId: string,
  payload: TailoringProfile,
): Promise<any> {
  const res = await apiClient.put(
    `/tailoring/workspaces/${workspaceId}`,
    payload,
  );
  return unwrap(res);
}

export async function upsertProjectTailoring(
  projectId: string,
  payload: TailoringProfile,
): Promise<any> {
  const res = await apiClient.put(
    `/tailoring/projects/${projectId}`,
    payload,
  );
  return unwrap(res);
}

export async function applyOrgTailoringToPolicies(): Promise<any> {
  const res = await apiClient.post('/tailoring/org/apply-to-policies');
  return unwrap(res);
}

export async function applyWorkspaceTailoringToPolicies(
  workspaceId: string,
): Promise<any> {
  const res = await apiClient.post(
    `/tailoring/workspaces/${workspaceId}/apply-to-policies`,
  );
  return unwrap(res);
}
