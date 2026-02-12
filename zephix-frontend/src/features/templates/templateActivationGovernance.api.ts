// ─────────────────────────────────────────────────────────────────────────────
// Template Activation Governance API — Phase 4.3
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/api/client';

export interface ActivationListItem {
  id: string;
  templateId: string;
  templateName: string;
  templateCategory: string | null;
  scopeType: 'ORG' | 'WORKSPACE';
  scopeId: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  activatedBy: string | null;
  activatedAt: string | null;
}

export interface ActivationState {
  templateId: string;
  templateName: string;
  scopeType: 'ORG' | 'WORKSPACE';
  scopeId: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  source: 'WORKSPACE' | 'ORG' | 'NONE';
  activatedBy: string | null;
  activatedAt: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
}

function unwrap<T>(res: any): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return res?.data?.data ?? res?.data ?? res;
}

export async function listActivations(
  scopeType: 'ORG' | 'WORKSPACE',
  scopeId: string,
): Promise<ActivationListItem[]> {
  const res = await apiClient.get('/template-activations', {
    params: { scopeType, scopeId },
  });
  return unwrap<ActivationListItem[]>(res);
}

export async function resolveActivation(
  templateId: string,
): Promise<ActivationState> {
  const res = await apiClient.get(
    `/template-activations/resolve/${templateId}`,
  );
  return unwrap<ActivationState>(res);
}

export async function governanceActivate(
  templateId: string,
  scopeType: 'ORG' | 'WORKSPACE',
  scopeId: string,
): Promise<unknown> {
  const res = await apiClient.post('/template-activations/activate', {
    templateId,
    scopeType,
    scopeId,
  });
  return unwrap(res);
}

export async function governanceDeactivate(
  templateId: string,
  scopeType: 'ORG' | 'WORKSPACE',
  scopeId: string,
): Promise<unknown> {
  const res = await apiClient.post('/template-activations/deactivate', {
    templateId,
    scopeType,
    scopeId,
  });
  return unwrap(res);
}

export async function requestActivation(
  templateId: string,
  scopeType: 'ORG' | 'WORKSPACE',
  scopeId: string,
  context?: { projectId?: string; phaseId?: string },
): Promise<{ requested: boolean }> {
  const res = await apiClient.post('/template-activations/request', {
    templateId,
    scopeType,
    scopeId,
    ...context,
  });
  return unwrap<{ requested: boolean }>(res);
}
