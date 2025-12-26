import { apiClient } from "@/lib/api/client";

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export const groupsApi = {
  async getGroups(): Promise<Group[]> {
    const { data } = await apiClient.get("/admin/groups");
    return (data as Group[]) || [];
  },

  async getGroup(groupId: string): Promise<Group> {
    const { data } = await apiClient.get(`/admin/groups/${groupId}`);
    return data as Group;
  },

  async createGroup(group: CreateGroupRequest): Promise<Group> {
    const { data } = await apiClient.post("/admin/groups", group);
    return data as Group;
  },

  async updateGroup(groupId: string, updates: UpdateGroupRequest): Promise<Group> {
    const { data } = await apiClient.patch(`/admin/groups/${groupId}`, updates);
    return data as Group;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/admin/groups/${groupId}`);
  },
};

