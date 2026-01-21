// Workspace-specific API functions for settings, members, permissions, etc.
// This file is separate from features/workspaces/api.ts which handles basic CRUD
import { api } from '@/lib/api';

type Workspace = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  privacy?: string;
  isPrivate?: boolean;
  owner?: { name?: string; email?: string };
};

type Member = {
  id: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  status?: 'active' | 'suspended';
  user?: { email?: string; role?: string };
};

type Permissions = {
  capabilities?: Record<string, Record<string, boolean>>;
};

export async function getWorkspace(id: string): Promise<Workspace | null> {
  try {
    const response = await api.get<{ data: Workspace | null }>(`/workspaces/${id}`);
    // Backend returns { data: Workspace | null }
    return response?.data?.data ?? response?.data ?? null;
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
    const response = await api.get<{ data: Member[] }>(`/workspaces/${workspaceId}/members`);
    // Backend returns { data: Member[] }
    if (response?.data?.data) {
      return response.data.data;
    }
    // Fallback to old format
    return Array.isArray(response?.data) ? response.data : [];
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
    const response = await api.get<{ data: { projects: any[]; total: number; page: number; totalPages: number } }>(`/projects?workspaceId=${id}`);
    // Backend returns { data: { projects, total, page, totalPages } }, extract projects array
    if (response?.data?.data?.projects) {
      return response.data.data.projects;
    }
    // Fallback to old format
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch workspace projects:', error);
    return [];
  }
}

export async function listTasksDueThisWeek(id: string): Promise<any[]> {
  try {
    const tasks = await api.get(`/tasks?workspaceId=${id}&due=week`);
    return Array.isArray(tasks) ? tasks : (tasks.data || []);
  } catch (error: any) {
    // Phase 6: Gracefully handle 404s for empty workspaces (endpoint may not exist yet)
    if (error?.response?.status === 404) {
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
