/**
 * Type-Safe API Service
 * 
 * This service provides a type-safe wrapper around the existing API service
 * without breaking existing functionality. It gradually replaces 'any' types
 * with proper TypeScript interfaces.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  PaginatedResponse, 
  User, 
  Workspace, 
  Project, 
  Task, 
  Resource,
  HeatmapData,
  LoginCredentials,
  SignupData,
  ProjectFilters,
  TaskFilters,
  ResourceAllocation,
  ApiErrorResponse,
  isApiResponse,
  isApiError
} from '../types/global';

/**
 * Type-safe API client that extends the existing API service
 * without breaking current functionality
 */
class TypeSafeApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(apiInstance: AxiosInstance) {
    this.api = apiInstance;
    this.baseURL = apiInstance.defaults.baseURL || '';
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Type-safe login method
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    try {
      const response = await this.api.post('/auth/login', credentials);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Type-safe signup method
   */
  async signup(data: SignupData): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    try {
      const response = await this.api.post('/auth/signup', data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Type-safe logout method
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await this.api.post('/auth/logout');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // WORKSPACE METHODS
  // ============================================================================

  /**
   * Get all workspaces for the current user
   */
  async getWorkspaces(): Promise<ApiResponse<Workspace[]>> {
    try {
      const response = await this.api.get('/workspaces');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(id: string): Promise<ApiResponse<Workspace>> {
    try {
      const response = await this.api.get(`/workspaces/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new workspace
   */
  async createWorkspace(data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Workspace>> {
    try {
      const response = await this.api.post('/workspaces', data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // PROJECT METHODS
  // ============================================================================

  /**
   * Get projects with optional filters
   */
  async getProjects(filters?: ProjectFilters): Promise<PaginatedResponse<Project>> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await this.api.get(`/projects?${params.toString()}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<ApiResponse<Project>> {
    try {
      const response = await this.api.get(`/projects/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new project
   */
  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'progress'>): Promise<ApiResponse<Project>> {
    try {
      const response = await this.api.post('/projects', data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update project
   */
  async updateProject(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Project>> {
    try {
      const response = await this.api.put(`/projects/${id}`, data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.api.delete(`/projects/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // TASK METHODS
  // ============================================================================

  /**
   * Get tasks with optional filters
   */
  async getTasks(filters?: TaskFilters): Promise<PaginatedResponse<Task>> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await this.api.get(`/tasks?${params.toString()}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get task by ID
   */
  async getTask(id: string): Promise<ApiResponse<Task>> {
    try {
      const response = await this.api.get(`/tasks/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new task
   */
  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'subtasks'>): Promise<ApiResponse<Task>> {
    try {
      const response = await this.api.post('/tasks', data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update task
   */
  async updateTask(id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'subtasks'>>): Promise<ApiResponse<Task>> {
    try {
      const response = await this.api.put(`/tasks/${id}`, data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // RESOURCE METHODS
  // ============================================================================

  /**
   * Get resources
   */
  async getResources(): Promise<ApiResponse<Resource[]>> {
    try {
      const response = await this.api.get('/resources');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get resource heatmap data
   */
  async getResourceHeatmap(params?: {
    workspaceId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<HeatmapData>> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value);
          }
        });
      }

      const response = await this.api.get(`/resources/heatmap?${queryParams.toString()}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get resource allocations
   */
  async getResourceAllocations(resourceId?: string): Promise<ApiResponse<ResourceAllocation[]>> {
    try {
      const params = resourceId ? `?resourceId=${resourceId}` : '';
      const response = await this.api.get(`/resources/allocations${params}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create resource allocation
   */
  async createResourceAllocation(data: Omit<ResourceAllocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ResourceAllocation>> {
    try {
      const response = await this.api.post('/resources/allocations', data);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generic GET request with type safety
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic POST request with type safety
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post(url, data, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic PUT request with type safety
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put(url, data, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic DELETE request with type safety
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Handle successful API responses
   */
  private handleResponse<T>(response: AxiosResponse): ApiResponse<T> {
    const data = response.data;
    
    // If response already has the expected structure, return it
    if (isApiResponse<T>(data)) {
      return data;
    }
    
    // Otherwise, wrap the response in the expected structure
    return {
      success: true,
      data: data as T,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: unknown): ApiErrorResponse {
    if (isApiError(error)) {
      return error;
    }

    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (response && isApiError(response.data)) {
        return response.data;
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        timestamp: new Date().toISOString()
      };
    }

    // Handle unknown errors
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a type-safe API service instance
 * This function can be used to gradually migrate from the existing API service
 */
export function createTypeSafeApi(apiInstance: AxiosInstance): TypeSafeApiService {
  return new TypeSafeApiService(apiInstance);
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy API service wrapper for backward compatibility
 * This allows existing code to continue working while gradually migrating to type-safe methods
 */
export class LegacyCompatibleApiService extends TypeSafeApiService {
  /**
   * Legacy method that returns 'any' for backward compatibility
   * @deprecated Use specific typed methods instead
   */
  async legacyRequest<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: any): Promise<T> {
    try {
      let response: AxiosResponse;
      
      switch (method) {
        case 'GET':
          response = await this.api.get(url);
          break;
        case 'POST':
          response = await this.api.post(url, data);
          break;
        case 'PUT':
          response = await this.api.put(url, data);
          break;
        case 'DELETE':
          response = await this.api.delete(url);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default TypeSafeApiService;
