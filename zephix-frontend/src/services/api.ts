import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useEnterpriseAuthStore } from '../stores/enterpriseAuthStore';

// Enterprise Security Configuration
const SECURITY_CONFIG = {
  REQUEST_TIMEOUT: 10000, // 10 seconds max
  MAX_RETRIES: 2,
  HTTPS_REQUIRED: import.meta.env.PROD,
  LOG_LEVEL: import.meta.env.DEV ? 'debug' : 'error',
} as const;

// Environment-specific API URL validation
const validateApiUrl = (url: string): string => {
  if (!url) {
    throw new Error('API URL is required');
  }

  try {
    const urlObj = new URL(url);
    
    // Enforce HTTPS in production
    if (SECURITY_CONFIG.HTTPS_REQUIRED && urlObj.protocol !== 'https:') {
      throw new Error('API URL must use HTTPS in production');
    }

    // Validate URL format
    if (!urlObj.hostname || !urlObj.protocol) {
      throw new Error('Invalid API URL format');
    }

    // Block localhost in production
    if (SECURITY_CONFIG.HTTPS_REQUIRED && (
      urlObj.hostname === 'localhost' || 
      urlObj.hostname === '127.0.0.1' ||
      urlObj.hostname.startsWith('192.168.') ||
      urlObj.hostname.startsWith('10.')
    )) {
      throw new Error('Local/private network URLs not allowed in production');
    }

    return url;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API URL validation failed: ${error.message}`);
    }
    throw new Error('API URL validation failed: Invalid URL format');
  }
};

// Get and validate API URL from environment
const getSecureApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    return validateApiUrl(envUrl);
  }

  // Fallback URLs with security validation
  if (import.meta.env.DEV) {
    return validateApiUrl('http://localhost:3000/api');  // ← ADD /api
  }

  // Production fallback - Railway backend
  return validateApiUrl('https://zephix-backend-production.up.railway.app/api');  // ← ADD /api
};

// Security headers configuration
const getSecurityHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  // Only these are valid REQUEST headers
});

// Create secure axios instance
const createSecureAxiosInstance = (): AxiosInstance => {
  const apiUrl = getSecureApiUrl();
  
  console.log(`🔒 Initializing secure API client for: ${apiUrl}`);
  
  const instance = axios.create({
    baseURL: apiUrl,
    timeout: SECURITY_CONFIG.REQUEST_TIMEOUT,
    headers: getSecurityHeaders(),
    withCredentials: true,
    maxRedirects: 0, // Prevent redirect attacks
    validateStatus: (status) => status < 500, // Only treat 5xx as errors
  });

  return instance;
};

// Security audit logging
const logSecurityEvent = (event: string, details: any, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    level,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  if (SECURITY_CONFIG.LOG_LEVEL === 'debug') {
    console.log(`🔒 [${level.toUpperCase()}] ${event}:`, logEntry);
  }

  // In production, this could be sent to security monitoring service
  if (level === 'error' && import.meta.env.PROD) {
    // TODO: Send to security monitoring service
    console.error('🚨 Security event logged:', logEntry);
  }
};

// Create the secure API instance
export const api = createSecureAxiosInstance();

// Request interceptor for security and authentication
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const startTime = Date.now();
    
    // Add request ID for tracking
    const requestId = crypto.randomUUID();
    config.headers = {
      ...config.headers,
      'X-Request-Id': requestId,
      'X-Timestamp': startTime.toString(),
    };

    // Add authentication token
               const token = useEnterpriseAuthStore.getState().user?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      logSecurityEvent('authenticated_request', { 
        requestId, 
        endpoint: config.url,
        method: config.method 
      });
    } else {
      logSecurityEvent('unauthenticated_request', { 
        requestId, 
        endpoint: config.url,
        method: config.method 
      });
    }

    // Log request for security audit
    logSecurityEvent('api_request', {
      requestId,
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!token,
      timestamp: startTime,
    });

    return config;
  },
  (error: AxiosError) => {
    logSecurityEvent('request_interceptor_error', {
      error: error.message,
      config: error.config,
    }, 'error');
    return Promise.reject(error);
  }
);

// Response interceptor for security monitoring and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const endTime = Date.now();
    const requestId = response.config.headers?.['X-Request-Id'];
    const startTime = parseInt(response.config.headers?.['X-Timestamp'] || '0');
    const duration = endTime - startTime;

    // Log successful response for security audit
    logSecurityEvent('api_response_success', {
      requestId,
      status: response.status,
      duration,
      endpoint: response.config.url,
      method: response.config.method,
    });

    // Security validation
    if (response.headers['x-frame-options'] !== 'DENY') {
      logSecurityEvent('security_warning', {
        requestId,
        warning: 'Missing X-Frame-Options header',
        endpoint: response.config.url,
      }, 'warn');
    }

    return response;
  },
  async (error: AxiosError) => {
    const requestId = error.config?.headers?.['X-Request-Id'];
    const endpoint = error.config?.url;
    const status = error.response?.status;

    // Log error for security audit
    logSecurityEvent('api_response_error', {
      requestId,
      status,
      endpoint,
      error: error.message,
      responseData: error.response?.data,
    }, 'error');

    // Handle authentication errors
    if (status === 401 && !error.config?._retry) {
      error.config._retry = true;
      
      try {
        logSecurityEvent('token_refresh_attempt', { requestId, endpoint });
        
                       const refreshed = await useEnterpriseAuthStore.getState().validateSession();
        if (refreshed) {
          logSecurityEvent('token_refresh_success', { requestId, endpoint });
          return api(error.config);
        } else {
          logSecurityEvent('token_refresh_failure', { requestId, endpoint }, 'warn');
        }
      } catch (refreshError) {
        logSecurityEvent('token_refresh_error', { 
          requestId, 
          endpoint, 
          error: refreshError instanceof Error ? refreshError.message : 'Unknown error' 
        }, 'error');
        
                       useEnterpriseAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Handle rate limiting
    if (status === 429) {
      logSecurityEvent('rate_limit_exceeded', { requestId, endpoint }, 'warn');
    }

    // Handle security-related errors
    if (status === 403) {
      logSecurityEvent('access_forbidden', { requestId, endpoint }, 'warn');
    }

    return Promise.reject(error);
  }
);

// AI Service API functions with security
export const aiApi = {
  sendMessage: async (message: string, projectId?: string) => {
    try {
      logSecurityEvent('ai_request', { projectId, messageLength: message.length });
      
      const response = await api.post('/ai/chat', { message, projectId });
      return response.data;
    } catch (error) {
      logSecurityEvent('ai_request_error', { 
        projectId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  getProjectInsights: async (projectId: string) => {
    try {
      logSecurityEvent('ai_insights_request', { projectId });
      
      const response = await api.get(`/ai/project/${projectId}/insights`);
      return response.data;
    } catch (error) {
      logSecurityEvent('ai_insights_error', { 
        projectId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  generateReport: async (projectId: string, reportType: string) => {
    try {
      logSecurityEvent('ai_report_generation', { projectId, reportType });
      
      const response = await api.post('/ai/reports/generate', { projectId, reportType });
      return response.data;
    } catch (error) {
      logSecurityEvent('ai_report_error', { 
        projectId, 
        reportType, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// Auth API functions with enhanced security
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      logSecurityEvent('login_attempt', { email: credentials.email });
      
      const response = await api.post('/auth/login', credentials);
      
      logSecurityEvent('login_success', { email: credentials.email });
      return response.data;
    } catch (error) {
      logSecurityEvent('login_failure', { 
        email: credentials.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error instanceof AxiosError ? error.response?.status : undefined,
      }, 'error');
      throw error;
    }
  },

  register: async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      logSecurityEvent('registration_attempt', { 
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });
      
      const response = await api.post('/auth/register', userData);
      
      logSecurityEvent('registration_success', { email: userData.email });
      return response.data;
    } catch (error) {
      logSecurityEvent('registration_failure', { 
        email: userData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error instanceof AxiosError ? error.response?.status : undefined,
      }, 'error');
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      logSecurityEvent('user_profile_request');
      
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      logSecurityEvent('user_profile_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  logout: async () => {
    try {
      logSecurityEvent('logout_attempt');
      
      await api.post('/auth/logout');
      
      logSecurityEvent('logout_success');
    } catch (error) {
      logSecurityEvent('logout_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      logSecurityEvent('token_refresh_request');
      
      const response = await api.post('/auth/refresh');
      
      logSecurityEvent('token_refresh_success');
      return response.data;
    } catch (error) {
      logSecurityEvent('token_refresh_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// Feedback API functions with security logging
export const feedbackApi = {
  submit: async (data: { type: string; content: string; metadata?: any }) => {
    try {
      logSecurityEvent('feedback_submission', { 
        type: data.type,
        contentLength: data.content.length,
        hasMetadata: !!data.metadata,
      });
      
      const response = await api.post('/feedback', data);
      return response.data;
    } catch (error) {
      logSecurityEvent('feedback_submission_error', { 
        type: data.type,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  getStatistics: async () => {
    try {
      logSecurityEvent('feedback_statistics_request');
      
      const response = await api.get('/feedback/statistics');
      return response.data;
    } catch (error) {
      logSecurityEvent('feedback_statistics_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  getAll: async () => {
    try {
      logSecurityEvent('feedback_list_request');
      
      const response = await api.get('/feedback');
      return response.data;
    } catch (error) {
      logSecurityEvent('feedback_list_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// Projects API functions with security logging
export const projectsApi = {
  getAll: async () => {
    try {
      logSecurityEvent('projects_list_request');
      
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      logSecurityEvent('projects_list_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      logSecurityEvent('project_detail_request', { projectId: id });
      
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      logSecurityEvent('project_detail_error', { 
        projectId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  create: async (data: any) => {
    try {
      logSecurityEvent('project_creation', { 
        projectName: data.name,
        hasDescription: !!data.description,
      });
      
      const response = await api.post('/projects', data);
      return response.data;
    } catch (error) {
      logSecurityEvent('project_creation_error', { 
        projectName: data.name,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    try {
      logSecurityEvent('project_update', { 
        projectId: id,
        updateFields: Object.keys(data),
      });
      
      const response = await api.patch(`/projects/${id}`, data);
      return response.data;
    } catch (error) {
      logSecurityEvent('project_update_error', { 
        projectId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      logSecurityEvent('project_deletion', { projectId: id });
      
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      logSecurityEvent('project_deletion_error', { 
        projectId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// Export security utilities for external use
export const securityUtils = {
  logSecurityEvent,
  validateApiUrl,
  getSecureApiUrl,
  SECURITY_CONFIG,
};

export default api;// Force deployment Sun Aug 17 11:51:56 CDT 2025
