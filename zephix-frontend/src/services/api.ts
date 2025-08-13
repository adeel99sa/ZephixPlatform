import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Get API URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
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
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshed = await useAuthStore.getState().refreshSession();
        if (refreshed) {
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// AI Service API functions
export const aiApi = {
  sendMessage: async (message: string, projectId?: string) => {
    try {
      const response = await api.post('/ai/chat', { message, projectId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getProjectInsights: async (projectId: string) => {
    try {
      const response = await api.get(`/ai/project/${projectId}/insights`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  generateReport: async (projectId: string, reportType: string) => {
    try {
      const response = await api.post('/ai/reports/generate', { projectId, reportType });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Auth API functions
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  register: async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Feedback API functions
export const feedbackApi = {
  submit: async (data: { type: string; content: string; metadata?: any }) => {
    try {
      const response = await api.post('/feedback', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getStatistics: async () => {
    try {
      const response = await api.get('/feedback/statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAll: async () => {
    try {
      const response = await api.get('/feedback');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Projects API functions
export const projectsApi = {
  getAll: async () => {
    try {
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (data: any) => {
    try {
      const response = await api.post('/projects', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    try {
      const response = await api.patch(`/projects/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api; 