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
    const { data } = await apiClient.get("/admin/users", { params });
    return data as UsersListResponse;
  },

  async getUser(userId: string): Promise<User> {
    const { data } = await apiClient.get(`/admin/users/${userId}`);
    return data as User;
  },

  async createUser(user: CreateUserRequest): Promise<User> {
    const { data } = await apiClient.post("/admin/users", user);
    return data as User;
  },

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    const { data } = await apiClient.patch(`/admin/users/${userId}`, updates);
    return data as User;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  async updateUserRole(userId: string, role: "admin" | "member" | "viewer"): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/role`, { role });
  },
};

