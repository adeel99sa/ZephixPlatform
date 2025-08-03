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
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      toast.error('Session expired. Please log in again.');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('Something went wrong. Please try again.');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Projects API
export const projectsApi = {
  getAll: async (): Promise<{ projects: Project[] }> => {
    const response = await api.get('/projects');
    return response.data;
  },

  getById: async (id: string): Promise<{ project: Project }> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectData): Promise<{ project: Project }> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateProjectData>): Promise<{ project: Project }> => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

// Feedback API
export const feedbackApi = {
  submit: async (data: FeedbackData): Promise<{ message: string; feedbackId: string }> => {
    const response = await api.post('/feedback', data);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/feedback/statistics');
    return response.data;
  },
};

export default api; 