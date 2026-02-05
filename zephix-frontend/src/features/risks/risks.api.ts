/**
 * Risks API – single source of truth for risk CRUD.
 * All calls use api from @/lib/api (x-workspace-id set by interceptor).
 * Fail fast if no active workspace; do not send the request.
 */

import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import type { Risk, CreateRiskInput, ListRisksParams, ListRisksResponse } from './types';

// --- Workspace invariant helper ---

function requireActiveWorkspace(): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) {
    const err = new Error('Active workspace required');
    (err as unknown as { code: string }).code = 'WORKSPACE_REQUIRED';
    throw err;
  }
  return wsId;
}

// --- API Functions ---

/**
 * List risks for a project.
 * Requires projectId.
 */
export async function listRisks(params: ListRisksParams): Promise<ListRisksResponse> {
  requireActiveWorkspace();

  const queryParams = new URLSearchParams();
  queryParams.set('projectId', params.projectId);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.status) queryParams.set('status', params.status);

  const res = await api.get(`/work/risks?${queryParams.toString()}`);
  return res.data;
}

/**
 * Create a new risk.
 * Feature flagged - only call when risksEnabled is true.
 */
export async function createRisk(input: CreateRiskInput): Promise<Risk> {
  requireActiveWorkspace();

  const res = await api.post('/work/risks', input);
  return res.data;
}

/**
 * Generate a temporary ID for optimistic updates.
 */
export function generateTempRiskId(): string {
  return `temp-risk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
