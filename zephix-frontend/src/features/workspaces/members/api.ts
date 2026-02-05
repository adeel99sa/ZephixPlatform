import { api, unwrapApiData } from '@/lib/api';

export type WorkspaceMemberRow = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'member' | 'viewer';
  createdAt: string;
};

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
  const res = await api.get(`/workspaces/${workspaceId}/members`);
  return unwrapApiData<WorkspaceMemberRow[]>(res.data) || [];
}

export async function addWorkspaceMember(workspaceId: string, input: { userId: string; role: 'owner' | 'member' | 'viewer' }) {
  const res = await api.post(`/workspaces/${workspaceId}/members`, input);
  return unwrapApiData<{ id: string }>(res.data);
}

export async function updateWorkspaceMemberRole(workspaceId: string, memberId: string, role: 'owner' | 'member' | 'viewer') {
  const res = await api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
  return unwrapApiData<{ success: true }>(res.data);
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string) {
  const res = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  return unwrapApiData<{ success: true }>(res.data);
}
