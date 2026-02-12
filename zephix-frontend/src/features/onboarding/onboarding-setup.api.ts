import { apiClient } from '@/lib/api/client';

export interface SetupStep {
  tailoringConfigured: boolean;
  policiesApplied: boolean;
  templatesActivated: boolean;
  projectCreated: boolean;
}

export interface WorkspaceSetupStatus {
  workspaceId: string;
  steps: SetupStep;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
}

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

export async function getWorkspaceSetupStatus(): Promise<WorkspaceSetupStatus> {
  const res = await apiClient.get('/work/workspaces/setup-status');
  return unwrap<WorkspaceSetupStatus>(res);
}
