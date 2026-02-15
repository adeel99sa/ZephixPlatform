import { request } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import type {
  ChangeRequest,
  CreateChangeRequestInput,
  UpdateChangeRequestInput,
  TransitionInput,
} from './types';

function requireWorkspace(): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) throw new Error('WORKSPACE_REQUIRED');
  return wsId;
}

function basePath(projectId: string): string {
  const wsId = requireWorkspace();
  return `/work/workspaces/${wsId}/projects/${projectId}/change-requests`;
}

export async function listChangeRequests(projectId: string): Promise<ChangeRequest[]> {
  return request.get<ChangeRequest[]>(basePath(projectId));
}

export async function getChangeRequest(projectId: string, id: string): Promise<ChangeRequest> {
  return request.get<ChangeRequest>(`${basePath(projectId)}/${id}`);
}

export async function createChangeRequest(
  projectId: string,
  input: CreateChangeRequestInput,
): Promise<ChangeRequest> {
  return request.post<ChangeRequest>(basePath(projectId), input);
}

export async function updateChangeRequest(
  projectId: string,
  id: string,
  input: UpdateChangeRequestInput,
): Promise<ChangeRequest> {
  return request.patch<ChangeRequest>(`${basePath(projectId)}/${id}`, input);
}

export async function submitChangeRequest(projectId: string, id: string): Promise<ChangeRequest> {
  return request.post<ChangeRequest>(`${basePath(projectId)}/${id}/submit`);
}

export async function approveChangeRequest(projectId: string, id: string): Promise<ChangeRequest> {
  return request.post<ChangeRequest>(`${basePath(projectId)}/${id}/approve`);
}

export async function rejectChangeRequest(
  projectId: string,
  id: string,
  input?: TransitionInput,
): Promise<ChangeRequest> {
  return request.post<ChangeRequest>(`${basePath(projectId)}/${id}/reject`, input ?? {});
}

export async function implementChangeRequest(
  projectId: string,
  id: string,
): Promise<ChangeRequest> {
  return request.post<ChangeRequest>(`${basePath(projectId)}/${id}/implement`);
}

export async function deleteChangeRequest(projectId: string, id: string): Promise<void> {
  await request.delete(`${basePath(projectId)}/${id}`);
}
