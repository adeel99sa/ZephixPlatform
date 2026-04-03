/**
 * Risks API – single source of truth for risk CRUD.
 * All calls use api from @/lib/api (x-workspace-id set by interceptor).
 * Fail fast if no active workspace; do not send the request.
 */

import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import type { Risk, CreateRiskInput, UpdateRiskInput, ListRisksParams, ListRisksResponse } from './types';

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
 * Get a single risk by ID.
 */
export async function getRisk(riskId: string): Promise<Risk> {
  requireActiveWorkspace();
  const res = await api.get(`/work/risks/${riskId}`);
  return res.data;
}

/**
 * Update a risk.
 */
export async function updateRisk(riskId: string, input: UpdateRiskInput): Promise<Risk> {
  requireActiveWorkspace();
  const res = await api.patch(`/work/risks/${riskId}`, input);
  return res.data;
}

/**
 * Delete (soft-delete) a risk.
 */
export async function deleteRisk(riskId: string): Promise<void> {
  requireActiveWorkspace();
  await api.delete(`/work/risks/${riskId}`);
}

/**
 * Generate a temporary ID for optimistic updates.
 */
export function generateTempRiskId(): string {
  return `temp-risk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
