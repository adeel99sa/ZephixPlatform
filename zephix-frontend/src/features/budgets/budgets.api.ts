import { request } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import type { ProjectBudget, UpdateBudgetInput } from './types';

function requireWorkspace(): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) throw new Error('WORKSPACE_REQUIRED');
  return wsId;
}

function basePath(projectId: string): string {
  const wsId = requireWorkspace();
  return `/work/workspaces/${wsId}/projects/${projectId}/budget`;
}

export async function getBudget(projectId: string): Promise<ProjectBudget> {
  return request.get<ProjectBudget>(basePath(projectId));
}

export async function updateBudget(
  projectId: string,
  input: UpdateBudgetInput,
): Promise<ProjectBudget> {
  return request.patch<ProjectBudget>(basePath(projectId), input);
}
