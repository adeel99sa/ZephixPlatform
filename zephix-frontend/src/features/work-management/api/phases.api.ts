import { apiClient } from '@/lib/api/client';
import { useWorkspaceStore } from '@/state/workspace.store';
import { UpdatePhaseRequest, AckRequiredResponse } from '../types/ack.types';

export interface WorkPhase {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  startDate: string | null;
  dueDate: string | null;
  isLocked: boolean;
}

/**
 * Update phase name or due date
 * Returns WorkPhase on success, or AckRequiredResponse if acknowledgement is required
 */
export async function updatePhase(
  phaseId: string,
  updates: UpdatePhaseRequest,
  ackToken?: string
): Promise<WorkPhase | AckRequiredResponse> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  if (!activeWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED');
  }

  const headers: Record<string, string> = {
    'x-workspace-id': activeWorkspaceId,
  };

  if (ackToken) {
    headers['x-ack-token'] = ackToken;
  }

  const response = await apiClient.patch<{ data: WorkPhase } | AckRequiredResponse>(
    `/work/phases/${phaseId}`,
    updates,
    { headers }
  );

  // If response has ack, return it directly (not wrapped in { data })
  if ('ack' in response) {
    return response as unknown as AckRequiredResponse;
  }

  // Otherwise, extract data from success response
  return (response as unknown as { data: WorkPhase }).data;
}

