import { apiClient } from "@/lib/api/client";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "inactive";
  lastActive?: string;
  joinedAt: string;
  organizationId?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  status?: "active" | "inactive";
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  status?: "active" | "inactive";
}

export interface UsersListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const usersApi = {
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UsersListResponse> {
    const data = await apiClient.get<UsersListResponse>("/admin/users", { params });
    return data;
  },

  async getUser(userId: string): Promise<User> {
    const data = await apiClient.get<User>(`/admin/users/${userId}`);
    return data;
  },

  async createUser(user: CreateUserRequest): Promise<User> {
    const data = await apiClient.post<User>("/admin/users", user);
    return data;
  },

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    const data = await apiClient.patch<User>(`/admin/users/${userId}`, updates);
    return data;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  async updateUserRole(userId: string, role: "admin" | "member" | "viewer"): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/role`, { role });
  },
};

