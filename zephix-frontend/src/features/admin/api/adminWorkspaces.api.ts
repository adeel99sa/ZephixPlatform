/**
 * PROMPT 6: Admin Workspaces API
 *
 * Functions for admin workspace management:
 * - listWorkspaces: GET /api/workspaces
 * - createWorkspace: POST /api/workspaces
 * - updateWorkspaceOwners: PATCH /api/workspaces/:id/owners
 */
import { api } from '@/lib/api';
import { unwrapData } from '@/lib/api/unwrapData';

type Workspace = {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type CreateWorkspacePayload = {
  name: string;
  description?: string;
  ownerUserIds: string[];
};

type CreateWorkspaceResponse = {
  id: string;
  workspaceId: string;
  name: string;
  slug?: string | null;
  role: string;
};

/**
 * List all workspaces in the organization
 * Returns { data: Workspace[] }
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  try {
    const response = await api.get<{ data: Workspace[] }>('/workspaces');
    return unwrapData<Workspace[]>(response) || [];
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    throw error;
  }
}

/**
 * Create a new workspace
 * Body: { name, description?, ownerUserIds: string[] }
 * Returns { data: { workspaceId } }
 */
export async function createWorkspace(
  payload: CreateWorkspacePayload
): Promise<CreateWorkspaceResponse> {
  try {
    const response = await api.post<{ data: CreateWorkspaceResponse }>(
      '/workspaces',
      payload
    );
    const data = unwrapData<CreateWorkspaceResponse>(response);
    if (data?.workspaceId) {
      return data;
    }
    return {
      id: data?.id || '',
      workspaceId: data?.id || '',
      name: data?.name || '',
      slug: data?.slug,
      role: data?.role || 'workspace_owner',
    };
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw error;
  }
}

/**
 * Update workspace owners
 * PATCH /api/workspaces/:id/owners
 * Body: { ownerUserIds: string[] }
 * Returns { data }
 */
export async function updateWorkspaceOwners(
  workspaceId: string,
  ownerUserIds: string[]
): Promise<any> {
  try {
    const response = await api.patch<{ data: any }>(
      `/workspaces/${workspaceId}/owners`,
      { ownerUserIds }
    );
    return unwrapData(response);
  } catch (error) {
    console.error('Failed to update workspace owners:', error);
    throw error;
  }
}
