import axios from 'axios';
import type { AxiosResponse } from 'axios';
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
  (error) => {
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

// Auth API with enhanced functionality
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Clear local auth state
    useAuthStore.getState().clearAuth();
    toast.success('Logged out successfully');
  },
};

// Enhanced Projects API with full CRUD operations
export const projectsApi = {
  getAll: async (): Promise<{ projects: Project[]; count: number; message: string }> => {
    const response = await api.get('/projects');
    return response.data;
  },

  getById: async (id: string): Promise<{ project: Project; message: string }> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectData): Promise<{ project: Project; message: string }> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateProjectData>): Promise<{ project: Project; message: string }> => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // Team management endpoints
  addTeamMember: async (projectId: string, memberData: {
    userId: string;
    roleId: string;
  }): Promise<{ teamMember: any; message: string }> => {
    const response = await api.post(`/projects/${projectId}/team/members`, memberData);
    return response.data;
  },

  updateTeamMember: async (projectId: string, memberId: string, memberData: {
    roleId: string;
  }): Promise<{ teamMember: any; message: string }> => {
    const response = await api.patch(`/projects/${projectId}/team/members/${memberId}`, memberData);
    return response.data;
  },

  removeTeamMember: async (projectId: string, memberId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/projects/${projectId}/team/members/${memberId}`);
    return response.data;
  },
};

// Enhanced Feedback API
export const feedbackApi = {
  submit: async (data: FeedbackData): Promise<{ message: string; feedbackId: string }> => {
    const response = await api.post('/feedback', data);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/feedback/statistics');
    return response.data;
  },

  getAll: async (): Promise<{ feedbacks: any[]; count: number }> => {
    const response = await api.get('/feedback');
    return response.data;
  },
};

// File upload API for BRD processing
export const fileApi = {
  uploadBRD: async (file: File, projectId: string): Promise<{ message: string; fileId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    
    const response = await api.post('/files/upload-brd', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProjectFiles: async (projectId: string): Promise<{ files: any[] }> => {
    const response = await api.get(`/files/project/${projectId}`);
    return response.data;
  },
};

// AI Service API for chat functionality
export const aiApi = {
  sendMessage: async (message: string, projectId?: string): Promise<{ response: string; messageId: string }> => {
    const response = await api.post('/ai/chat', { message, projectId });
    return response.data;
  },

  getProjectInsights: async (projectId: string): Promise<{ insights: any[] }> => {
    const response = await api.get(`/ai/project/${projectId}/insights`);
    return response.data;
  },

  generateReport: async (projectId: string, reportType: string): Promise<{ reportUrl: string }> => {
    const response = await api.post('/ai/reports/generate', { projectId, reportType });
    return response.data;
  },
};

export default api; 