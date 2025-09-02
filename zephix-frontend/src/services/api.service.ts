import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api.config';

// Types for API responses
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  budget?: number;
  template?: string;
  methodology?: string;
  priority?: string;
  department?: string;
  stakeholders?: string[];
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ResourceAllocation {
  id: string;
  projectId: string;
  userId: string;
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
  role: string;
}

interface ResourceHeatMap {
  [userId: string]: {
    name: string;
    totalHours: number;
    projects: Array<{
      projectId: string;
      projectName: string;
      hours: number;
    }>;
  };
}

interface ResourceConflict {
  id: string;
  userId: string;
  projectId: string;
  conflictType: string;
  startDate: string;
  endDate: string;
  severity: string;
}

interface Risk {
  id: string;
  projectId: string;
  title: string;
  description: string;
  probability: number;
  impact: number;
  status: string;
  mitigation?: string;
}

interface AIQueryResponse {
  response: string;
  context: any;
  usage: {
    tokens: number;
    cost: number;
  };
}

interface AIUsage {
  totalQueries: number;
  totalTokens: number;
  totalCost: number;
  period: string;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}/auth/refresh`,
            { token: refreshToken }
          );

          const { access_token } = response.data;
          localStorage.setItem('token', access_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Generic API methods
const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config).then(response => response.data),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config).then(response => response.data),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config).then(response => response.data),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then(response => response.data),
};

// Auth API methods
export const auth = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  signup: (data: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
  }): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/signup', data),
  
  refresh: (): Promise<{ access_token: string }> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    return api.post<{ access_token: string }>('/auth/refresh', { token: refreshToken });
  },
};

// Projects API methods
export const projects = {
  list: (): Promise<Project[]> =>
    api.get<Project[]>('/projects'),
  
  create: (data: Partial<Project>): Promise<Project> =>
    api.post<Project>('/projects', data),
  
  update: (id: string, data: Partial<Project>): Promise<Project> =>
    api.put<Project>(`/projects/${id}`, data),
  
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/projects/${id}`),
};

// Resources API methods
export const resources = {
  allocate: (data: Partial<ResourceAllocation>): Promise<ResourceAllocation> =>
    api.post<ResourceAllocation>('/resources/allocate', data),
  
  getHeatMap: (): Promise<ResourceHeatMap> =>
    api.get<ResourceHeatMap>('/resources/heat-map'),
  
  getConflicts: (): Promise<ResourceConflict[]> =>
    api.get<ResourceConflict[]>('/resources/conflicts'),
};

// Risks API methods
export const risks = {
  scan: (projectId: string): Promise<Risk[]> =>
    api.get<Risk[]>(`/risks/scan/${projectId}`),
  
  getByProject: (projectId: string): Promise<Risk[]> =>
    api.get<Risk[]>(`/risks/project/${projectId}`),
};

// AI API methods
export const ai = {
  query: (query: string, context?: any): Promise<AIQueryResponse> =>
    api.post<AIQueryResponse>('/ai/query', { query, context }),
  
  getUsage: (): Promise<AIUsage> =>
    api.get<AIUsage>('/ai/usage'),
};

// Backward compatibility exports (for migration)
export const apiGet = <T = any>(endpoint: string): Promise<T> => api.get<T>(endpoint);
export const apiPost = <T = any>(endpoint: string, data?: any): Promise<T> => api.post<T>(endpoint, data);
export const apiPut = <T = any>(endpoint: string, data?: any): Promise<T> => api.put<T>(endpoint, data);
export const apiDelete = <T = any>(endpoint: string): Promise<T> => api.delete<T>(endpoint);

// Legacy apiRequest for backward compatibility
export const apiRequest = async <T = any>(endpoint: string, options: any = {}): Promise<T> => {
  const method = options.method || 'GET';
  const data = options.body || options.data;
  
  switch (method.toUpperCase()) {
    case 'GET':
      return api.get<T>(endpoint);
    case 'POST':
      return api.post<T>(endpoint, data);
    case 'PUT':
      return api.put<T>(endpoint, data);
    case 'DELETE':
      return api.delete<T>(endpoint);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
};

// Legacy apiJson for backward compatibility
export const apiJson = apiRequest;

// Export the main API object
export default {
  auth,
  projects,
  resources,
  risks,
  ai,
  // Backward compatibility
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiJson,
};