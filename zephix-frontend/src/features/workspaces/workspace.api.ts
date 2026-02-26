// Workspace-specific API functions for settings, members, permissions, etc.
// This file is separate from features/workspaces/api.ts which handles basic CRUD
import { api } from '@/lib/api';

export type WorkspaceApiData = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  privacy?: string;
  isPrivate?: boolean;
  ownerId?: string;
  owner?: {
    id?: string;
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  homeNotes?: string;
};

// Alias for backwards compatibility
type Workspace = WorkspaceApiData;

export type WorkspaceMember = {
  id: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  status?: 'active' | 'suspended';
  user?: {
    id?: string;
    email?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
};

// Alias for backwards compatibility
type Member = WorkspaceMember;

type Permissions = {
  capabilities?: Record<string, Record<string, boolean>>;
};

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  try {
    const payload = await api.get<Workspace | { data: Workspace | null } | null>(
      `/workspaces/${id}`,
    );
    const workspace = unwrapData<Workspace | null>(payload);
    return workspace ?? null;
  } catch (error: any) {
    // Re-throw 403 (access denied) so caller can handle it
    if (error?.response?.status === 403) {
      throw error;
    }
    // Return null for 404 or other errors
    return null;
  }
}

export async function updateWorkspace(id: string, body: Partial<Workspace>): Promise<Workspace> {
  return api.patch(`/workspaces/${id}`, body);
}

export async function getMembers(id: string): Promise<Member[]> {
  try {
    const response = await api.get(`/workspaces/${id}/members`);
    return Array.isArray(response) ? response : response.data || [];
  } catch (error) {
    console.error('Failed to fetch workspace members:', error);
    return [];
  }
}

// New member management functions per Phase 3
export async function listOrgUsers(): Promise<any[]> {
  try {
    const response = await api.get<{ users: any[]; total: number }>(`/organizations/users`);
    // Backend returns { users: [...], total: number }
    if (response?.data?.users) {
      return response.data.users;
    }
    // Fallback to old format
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to list org users:', error);
    return [];
  }
}

export async function listWorkspaceMembers(workspaceId: string): Promise<Member[]> {
  try {
    const payload = await api.get<Member[] | { data: Member[] }>(
      `/workspaces/${workspaceId}/members`,
    );
    const unwrapped = unwrapData<Member[] | { data: Member[] }>(payload);
    if (Array.isArray(unwrapped)) {
      return unwrapped;
    }
    const nested =
      unwrapped && typeof unwrapped === 'object'
        ? (unwrapped as { data?: Member[] }).data
        : undefined;
    return Array.isArray(nested) ? nested : [];
  } catch (error) {
    console.error('Failed to fetch workspace members:', error);
    return [];
  }
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer'
): Promise<any> {
  try {
    return api.post(`/workspaces/${workspaceId}/members`, { userId, role });
  } catch (error) {
    console.error('Failed to add workspace member:', error);
    throw error;
  }
}

export async function changeWorkspaceRole(
  workspaceId: string,
  userId: string,
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer'
): Promise<any> {
  try {
    return api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
  } catch (error) {
    console.error('Failed to change workspace role:', error);
    throw error;
  }
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<any> {
  try {
    return api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  } catch (error) {
    console.error('Failed to remove workspace member:', error);
    throw error;
  }
}

/**
 * PROMPT 8: Suspend workspace member
 */
export async function suspendWorkspaceMember(
  workspaceId: string,
  memberId: string
): Promise<{ memberId: string; status: 'suspended' }> {
  try {
    const response = await api.patch<{ data: { memberId: string; status: 'suspended' } }>(
      `/workspaces/${workspaceId}/members/${memberId}/suspend`,
      {}
    );
    return response.data.data || { memberId, status: 'suspended' };
  } catch (error) {
    console.error('Failed to suspend member:', error);
    throw error;
  }
}

/**
 * PROMPT 8: Reinstate workspace member
 */
export async function reinstateWorkspaceMember(
  workspaceId: string,
  memberId: string
): Promise<{ memberId: string; status: 'active' }> {
  try {
    const response = await api.patch<{ data: { memberId: string; status: 'active' } }>(
      `/workspaces/${workspaceId}/members/${memberId}/reinstate`,
      {}
    );
    return response.data.data || { memberId, status: 'active' };
  } catch (error) {
    console.error('Failed to reinstate member:', error);
    throw error;
  }
}

export async function changeWorkspaceOwner(workspaceId: string, newOwnerId: string): Promise<any> {
  try {
    return api.post(`/workspaces/${workspaceId}/change-owner`, { newOwnerId });
  } catch (error) {
    console.error('Failed to change workspace owner:', error);
    throw error;
  }
}

// Legacy function - kept for backwards compatibility
export async function inviteMember(id: string, body: { email: string }): Promise<any> {
  // This should not be used - external invites go through /admin/invite
  console.warn("inviteMember is deprecated. Use /admin/invite for external invites.");
  throw new Error("External invites must go through /admin/invite. Use addWorkspaceMember for existing users.");
}

// Legacy function - kept for backwards compatibility
export async function removeMember(id: string, userId: string): Promise<any> {
  return removeWorkspaceMember(id, userId);
}

export async function getPermissions(id: string): Promise<Permissions> {
  try {
    return api.get(`/workspaces/${id}/permissions`);
  } catch (error) {
    console.error('Failed to fetch workspace permissions:', error);
    // Return default permissions if endpoint doesn't exist
    return {
      capabilities: {
        invite: { owner: true, member: true, viewer: false },
        delete: { owner: true, member: false, viewer: false },
        manage_templates: { owner: true, member: true, viewer: false },
      }
    };
  }
}

export async function updatePermissions(id: string, body: Permissions): Promise<Permissions> {
  try {
    return api.patch(`/workspaces/${id}/permissions`, body);
  } catch (error) {
    console.error('Failed to update permissions:', error);
    throw error;
  }
}

export async function getKpiSummary(id: string): Promise<any | null> {
  try {
    return api.get(`/api/kpi/workspaces/${id}/summary`);
  } catch (error: any) {
    // Phase 6: Gracefully handle 404s for empty workspaces (endpoint may not exist yet)
    if (error?.response?.status === 404) {
      return null;
    }
    console.error('Failed to fetch KPI summary:', error);
    // Return null for empty workspaces, let component handle empty state
    return null;
  }
}

export async function listProjects(id: string): Promise<any[]> {
  try {
    const payload = await api.get<
      any[] | { projects?: any[] } | { data?: { projects?: any[] } }
    >(`/projects?workspaceId=${id}`);
    const unwrapped = unwrapData<
      any[] | { projects?: any[] } | { data?: { projects?: any[] } }
    >(payload);
    if (Array.isArray(unwrapped)) {
      return unwrapped;
    }
    if (unwrapped && typeof unwrapped === 'object') {
      const directProjects = (unwrapped as { projects?: any[] }).projects;
      if (Array.isArray(directProjects)) {
        return directProjects;
      }
      const nestedProjects = (unwrapped as { data?: { projects?: any[] } }).data
        ?.projects;
      if (Array.isArray(nestedProjects)) {
        return nestedProjects;
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch workspace projects:', error);
    return [];
  }
}

/**
 * Tasks due this week in the active workspace.
 * Uses GET /api/work/tasks with server-side dueFrom/dueTo. Requires x-workspace-id.
 */
export async function listTasksDueThisWeek(_workspaceId: string): Promise<any[]> {
  try {
    const { listTasks } = await import('@/features/work-management/workTasks.api');
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueFrom = now.toISOString().slice(0, 10);
    const dueTo = weekEnd.toISOString().slice(0, 10);
    const result = await listTasks({
      dueFrom,
      dueTo,
      limit: 200,
      sortBy: 'dueDate',
      sortDir: 'asc',
    });
    return result.items;
  } catch (error: any) {
    if (error?.response?.status === 404 || (error as any)?.code === 'WORKSPACE_REQUIRED') {
      return [];
    }
    console.error('Failed to fetch tasks due this week:', error);
    return [];
  }
}

export async function listRecentUpdates(id: string): Promise<any[]> {
  try {
    const updates = await api.get(`/api/activity?workspaceId=${id}&limit=10`);
    return Array.isArray(updates) ? updates : (updates.data || []);
  } catch (error: any) {
    // Phase 6: Gracefully handle 404s for empty workspaces (endpoint may not exist yet)
    if (error?.response?.status === 404) {
      return [];
    }
    console.error('Failed to fetch recent updates:', error);
    return [];
  }
}
