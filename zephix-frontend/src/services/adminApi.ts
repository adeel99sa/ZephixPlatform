class AdminApiService {
  private async request(url: string, options: RequestInit = {}) {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) throw new Error('Not authenticated');
    
    const { state } = JSON.parse(authStorage);
    if (!state?.token) throw new Error('No token found');
    
    // Use environment variable or relative path
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    
    const response = await fetch(`${baseUrl}/${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || response.statusText);
    }
    
    return response.json();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Authentication expired');
    }

    if (response.status === 403) {
      throw new Error('Admin access required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{
      userCount: number;
      templateCount: number;
      projectCount: number;
      lastActivity: string;
    }>(response);
  }

  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_BASE_URL}/admin/users?${query}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{
      data: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        isActive: boolean;
        createdAt: string;
        lastLoginAt: string;
        organizationId: string;
        organization: string;
      }>;
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(response);
  }

  async createAuditLog(action: string, details: any) {
    const response = await fetch(`${API_BASE_URL}/admin/audit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ action, details, timestamp: new Date().toISOString() })
    });
    return this.handleResponse<{ success: boolean }>(response);
  }
}

export const adminApi = new AdminApiService();
