import axios, { type AxiosResponse, type AxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL } from '../utils/constants';
import type {
  AuthResponse,
  LoginCredentials,
  Project,
  CreateProjectData,
  FeedbackData,
  User,
} from '../types';
import type { StoreError } from '../types/store';
import { createError } from '../types/store';

/**
 * Custom API error class for better error handling
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly endpoint: string;
  public readonly method: string;
  public readonly timestamp: string;

  constructor(
    message: string,
    status: number,
    code: string,
    endpoint: string,
    method: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
    this.method = method;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Helper function to create API errors from axios errors
 * @param error - Axios error object
 * @param endpoint - API endpoint that was called
 * @param method - HTTP method used
 * @returns ApiError instance
 */
const createApiError = (error: AxiosError, endpoint: string, method: string): ApiError => {
  const status = error.response?.status || 0;
  const message = error.response?.data?.message || error.message || 'API request failed';
  const code = error.code || 'UNKNOWN_ERROR';
  
  return new ApiError(message, status, code, endpoint, method);
};

/**
 * Helper function to convert API errors to store errors
 * @param apiError - ApiError instance
 * @returns StoreError instance
 */
const convertToStoreError = (apiError: ApiError): StoreError => {
  return createError('api', apiError.message, {
    endpoint: apiError.endpoint,
    method: apiError.method,
    status: apiError.status,
    code: apiError.code
  });
};

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const { response } = error;
    
    if (response?.status === 401) {
      useAuthStore.getState().clearAuth();
      toast.error('Session expired. Please log in again.');
      window.location.href = '/login';
    } else if (response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (response?.status === 404) {
      toast.error('Resource not found.');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (response?.data?.message) {
      toast.error(response.data.message);
    } else {
      toast.error('Something went wrong. Please try again.');
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API functions for user management
 */
export const authApi = {
  /**
   * Authenticate a user with email and password
   * @param credentials - User login credentials
   * @returns Promise resolving to authentication response with user data and access token
   * @throws {ApiError} When authentication fails
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/auth/login', 'POST');
      throw apiError;
    }
  },

  /**
   * Register a new user account
   * @param userData - User registration data including email, password, and personal information
   * @returns Promise resolving to authentication response with user data and access token
   * @throws {ApiError} When registration fails
   */
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> => {
    try {
      const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/auth/register', 'POST');
      throw apiError;
    }
  },

  /**
   * Get current user profile information
   * @returns Promise resolving to current user data
   * @throws {ApiError} When user data retrieval fails
   */
  getCurrentUser: async (): Promise<{ user: User }> => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/auth/profile', 'GET');
      throw apiError;
    }
  },

  /**
   * Logout current user and clear authentication state
   * @returns Promise that resolves when logout is complete
   * @throws {ApiError} When logout fails
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
      // Clear local auth state
      useAuthStore.getState().clearAuth();
      toast.success('Logged out successfully');
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/auth/logout', 'POST');
      // Still clear local auth state even if API call fails
      useAuthStore.getState().clearAuth();
      throw apiError;
    }
  },
};

/**
 * Projects API functions for project management
 */
export const projectsApi = {
  /**
   * Retrieve all projects for the current user
   * @returns Promise resolving to projects list with count and message
   * @throws {ApiError} When projects retrieval fails
   */
  getAll: async (): Promise<{ projects: Project[]; count: number; message: string }> => {
    try {
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/projects', 'GET');
      throw apiError;
    }
  },

  /**
   * Retrieve a specific project by ID
   * @param id - Project unique identifier
   * @returns Promise resolving to project data with message
   * @throws {ApiError} When project retrieval fails
   */
  getById: async (id: string): Promise<{ project: Project; message: string }> => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/projects/${id}`, 'GET');
      throw apiError;
    }
  },

  /**
   * Create a new project
   * @param data - Project creation data including name, description, and other details
   * @returns Promise resolving to created project data with message
   * @throws {ApiError} When project creation fails
   */
  create: async (data: CreateProjectData): Promise<{ project: Project; message: string }> => {
    try {
      const response = await api.post('/projects', data);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/projects', 'POST');
      throw apiError;
    }
  },

  /**
   * Update an existing project
   * @param id - Project unique identifier
   * @param data - Partial project data to update
   * @returns Promise resolving to updated project data with message
   * @throws {ApiError} When project update fails
   */
  update: async (id: string, data: Partial<CreateProjectData>): Promise<{ project: Project; message: string }> => {
    try {
      const response = await api.patch(`/projects/${id}`, data);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/projects/${id}`, 'PATCH');
      throw apiError;
    }
  },

  /**
   * Delete a project permanently
   * @param id - Project unique identifier
   * @returns Promise resolving to success message
   * @throws {ApiError} When project deletion fails
   */
  delete: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/projects/${id}`, 'DELETE');
      throw apiError;
    }
  },

  /**
   * Add a team member to a project
   * @param projectId - Project unique identifier
   * @param memberData - Team member data including user ID and role
   * @returns Promise resolving to team member data with message
   * @throws {ApiError} When team member addition fails
   */
  addTeamMember: async (projectId: string, memberData: {
    userId: string;
    roleId: string;
  }): Promise<{ teamMember: any; message: string }> => {
    try {
      const response = await api.post(`/projects/${projectId}/team/members`, memberData);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/projects/${projectId}/team/members`, 'POST');
      throw apiError;
    }
  },

  /**
   * Update a team member's role in a project
   * @param projectId - Project unique identifier
   * @param memberId - Team member unique identifier
   * @param memberData - Updated team member data
   * @returns Promise resolving to updated team member data with message
   * @throws {ApiError} When team member update fails
   */
  updateTeamMember: async (projectId: string, memberId: string, memberData: {
    roleId: string;
  }): Promise<{ teamMember: any; message: string }> => {
    try {
      const response = await api.patch(`/projects/${projectId}/team/members/${memberId}`, memberData);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/projects/${projectId}/team/members/${memberId}`, 'PATCH');
      throw apiError;
    }
  },

  /**
   * Remove a team member from a project
   * @param projectId - Project unique identifier
   * @param memberId - Team member unique identifier
   * @returns Promise resolving to success message
   * @throws {ApiError} When team member removal fails
   */
  removeTeamMember: async (projectId: string, memberId: string): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/projects/${projectId}/team/members/${memberId}`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/projects/${projectId}/team/members/${memberId}`, 'DELETE');
      throw apiError;
    }
  },
};

/**
 * Feedback API functions for user feedback management
 */
export const feedbackApi = {
  /**
   * Submit user feedback
   * @param data - Feedback data including type, content, and metadata
   * @returns Promise resolving to feedback submission result with message and feedback ID
   * @throws {ApiError} When feedback submission fails
   */
  submit: async (data: FeedbackData): Promise<{ message: string; feedbackId: string }> => {
    try {
      const response = await api.post('/feedback', data);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/feedback', 'POST');
      throw apiError;
    }
  },

  /**
   * Get feedback statistics and analytics
   * @returns Promise resolving to feedback statistics data
   * @throws {ApiError} When statistics retrieval fails
   */
  getStatistics: async (): Promise<any> => {
    try {
      const response = await api.get('/feedback/statistics');
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/feedback/statistics', 'GET');
      throw apiError;
    }
  },

  /**
   * Retrieve all feedback entries (admin function)
   * @returns Promise resolving to feedback list with count
   * @throws {ApiError} When feedback retrieval fails
   */
  getAll: async (): Promise<{ feedbacks: any[]; count: number }> => {
    try {
      const response = await api.get('/feedback');
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/feedback', 'GET');
      throw apiError;
    }
  },
};

/**
 * File upload API functions for document processing
 */
export const fileApi = {
  /**
   * Upload a Business Requirements Document (BRD) for a project
   * @param file - File object to upload
   * @param projectId - Project unique identifier to associate the file with
   * @returns Promise resolving to upload result with message and file ID
   * @throws {ApiError} When file upload fails
   */
  uploadBRD: async (file: File, projectId: string): Promise<{ message: string; fileId: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      
      const response = await api.post('/files/upload-brd', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/files/upload-brd', 'POST');
      throw apiError;
    }
  },

  /**
   * Get all files associated with a project
   * @param projectId - Project unique identifier
   * @returns Promise resolving to project files list
   * @throws {ApiError} When file retrieval fails
   */
  getProjectFiles: async (projectId: string): Promise<{ files: any[] }> => {
    try {
      const response = await api.get(`/files/project/${projectId}`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/files/project/${projectId}`, 'GET');
      throw apiError;
    }
  },
};

/**
 * AI Service API functions for artificial intelligence features
 */
export const aiApi = {
  /**
   * Send a message to the AI assistant
   * @param message - User message to send to AI
   * @param projectId - Optional project ID for context-aware responses
   * @returns Promise resolving to AI response with message ID
   * @throws {ApiError} When AI message processing fails
   */
  sendMessage: async (message: string, projectId?: string): Promise<{ response: string; messageId: string }> => {
    try {
      const response = await api.post('/ai/chat', { message, projectId });
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/ai/chat', 'POST');
      throw apiError;
    }
  },

  /**
   * Get AI-generated insights for a project
   * @param projectId - Project unique identifier
   * @returns Promise resolving to project insights data
   * @throws {ApiError} When insights retrieval fails
   */
  getProjectInsights: async (projectId: string): Promise<{ insights: any[] }> => {
    try {
      const response = await api.get(`/ai/project/${projectId}/insights`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/ai/project/${projectId}/insights`, 'GET');
      throw apiError;
    }
  },

  /**
   * Generate an AI-powered report for a project
   * @param projectId - Project unique identifier
   * @param reportType - Type of report to generate
   * @returns Promise resolving to report generation result with URL
   * @throws {ApiError} When report generation fails
   */
  generateReport: async (projectId: string, reportType: string): Promise<{ reportUrl: string }> => {
    try {
      const response = await api.post('/ai/reports/generate', { projectId, reportType });
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, '/ai/reports/generate', 'POST');
      throw apiError;
    }
  },
};

/**
 * BRD Service API functions for Business Requirements Document management
 */
export const brdApi = {
  /**
   * Get a specific BRD by ID
   * @param brdId - BRD unique identifier
   * @returns Promise resolving to BRD data
   * @throws {ApiError} When BRD retrieval fails
   */
  getBRD: async (brdId: string): Promise<any> => {
    try {
      const response = await api.get(`/api/brd/${brdId}`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/api/brd/${brdId}`, 'GET');
      throw apiError;
    }
  },

  /**
   * Get BRD analysis results
   * @param brdId - BRD unique identifier
   * @returns Promise resolving to BRD analysis data
   * @throws {ApiError} When analysis retrieval fails
   */
  getBRDAnalysis: async (brdId: string): Promise<any> => {
    try {
      const response = await api.get(`/api/brd/project-planning/${brdId}/analysis`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/api/brd/project-planning/${brdId}/analysis`, 'GET');
      throw apiError;
    }
  },

  /**
   * Generate project plan from BRD
   * @param brdId - BRD unique identifier
   * @param data - Project plan generation data
   * @returns Promise resolving to generated project plan
   * @throws {ApiError} When plan generation fails
   */
  generateProjectPlan: async (brdId: string, data: { methodology: string }): Promise<any> => {
    try {
      const response = await api.post(`/api/brd/project-planning/${brdId}/generate-plan`, data);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/api/brd/project-planning/${brdId}/generate-plan`, 'POST');
      throw apiError;
    }
  },

  /**
   * Refine a generated project plan
   * @param planId - Project plan unique identifier
   * @param data - Plan refinement data
   * @returns Promise resolving to refined project plan
   * @throws {ApiError} When plan refinement fails
   */
  refinePlan: async (planId: string, data: { refinementRequest: string }): Promise<any> => {
    try {
      const response = await api.post(`/api/brd/project-planning/plans/${planId}/refine`, data);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/api/brd/project-planning/plans/${planId}/refine`, 'POST');
      throw apiError;
    }
  },

  /**
   * Create a project from a generated plan
   * @param planId - Project plan unique identifier
   * @param data - Project creation data
   * @returns Promise resolving to created project
   * @throws {ApiError} When project creation fails
   */
  createProjectFromPlan: async (planId: string, data: any): Promise<any> => {
    try {
      const response = await api.post(`/api/brd/project-planning/plans/${planId}/create-project`, data);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/api/brd/project-planning/plans/${planId}/create-project`, 'POST');
      throw apiError;
    }
  },

  /**
   * Delete a BRD
   * @param brdId - BRD unique identifier
   * @returns Promise resolving to deletion result
   * @throws {ApiError} When BRD deletion fails
   */
  deleteBRD: async (brdId: string): Promise<any> => {
    try {
      const response = await api.delete(`/api/brd/${brdId}`);
      return response.data;
    } catch (error) {
      const apiError = createApiError(error as AxiosError, `/api/brd/${brdId}`, 'DELETE');
      throw apiError;
    }
  },
};

export default api; 