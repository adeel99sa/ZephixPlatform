import { v4 as uuid } from 'uuid';
import { useAuthStore } from '../stores/authStore';

const isDev = import.meta.env.DEV;

export function getApiBase() {
  if (isDev) return '/api';
  const url = import.meta.env.VITE_API_URL;
  if (!url) throw new Error('VITE_API_URL required in production');
  return url.replace(/\/+$/, '');
}

export async function apiFetch(path: string, opts: any = {}) {
  const url = `${getApiBase()}${path}`;
  const { token } = useAuthStore.getState() || {};
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-Id': uuid(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 15000);

  try {
    return await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal
    });
  } finally {
    clearTimeout(id);
  }
}

export async function apiJson(path: string, opts: any = {}) {
  const r = await apiFetch(path, opts);
  
  if (r.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('UNAUTHORIZED');
  }
  
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('BAD_CONTENT_TYPE');
  
  const data = await r.json();
  
  if (!r.ok) {
    const msg = data?.message || data?.error || `HTTP_${r.status}`;
    throw new Error(msg);
  }
  
  return data;
}

// Legacy exports for backward compatibility during transition
export const api = {
  get: (path: string) => apiJson(path),
  post: (path: string, data?: any) => apiJson(path, { method: 'POST', body: data }),
  put: (path: string, data?: any) => apiJson(path, { method: 'PUT', body: data }),
  patch: (path: string, data?: any) => apiJson(path, { method: 'PATCH', body: data }),
  delete: (path: string) => apiJson(path, { method: 'DELETE' }),
};

// Axios instance for components that still need it (will be removed)
export const axiosInstance = {
  get: (path: string) => apiJson(path),
  post: (path: string, data?: any) => apiJson(path, { method: 'POST', body: data }),
  put: (path: string, data?: any) => apiJson(path, { method: 'PUT', body: data }),
  patch: (path: string, data?: any) => apiJson(path, { method: 'PATCH', body: data }),
  delete: (path: string) => apiJson(path, { method: 'DELETE' }),
};

// Security logging function (simplified)
export function logSecurityEvent(event: string, details: any = {}, level: string = 'info') {
  console.log(`[${level.toUpperCase()}] ${event}:`, details);
}

// Auth API functions using the new centralized client
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      logSecurityEvent('login_attempt', { email: credentials.email });
      
      const response = await apiJson('/auth/login', { method: 'POST', body: credentials });
      
      logSecurityEvent('login_success', { email: credentials.email });
      return response;
    } catch (error) {
      logSecurityEvent('login_failure', { 
        email: credentials.email,
        error: error instanceof Error ? error.message : 'Unknown error',
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
      
      const response = await apiJson('/auth/register', { method: 'POST', body: userData });
      
      logSecurityEvent('registration_success', { email: userData.email });
      return response;
    } catch (error) {
      logSecurityEvent('registration_failure', { 
        email: userData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'error');
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      logSecurityEvent('user_profile_request');
      
      const response = await apiJson('/auth/me');
      return response;
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
      
      await apiJson('/auth/logout', { method: 'POST' });
      
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
      
      const response = await apiJson('/auth/refresh', { method: 'POST' });
      
      logSecurityEvent('token_refresh_success');
      return response;
    } catch (error) {
      logSecurityEvent('token_refresh_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// AI API functions using the new centralized client
export const aiApi = {
  chat: async (message: string, projectId?: string) => {
    try {
      logSecurityEvent('ai_chat_request', { 
        messageLength: message.length,
        hasProjectId: !!projectId,
      });
      
      const response = await apiJson('/ai/chat', { method: 'POST', body: { message, projectId } });
      return response;
    } catch (error) {
      logSecurityEvent('ai_chat_error', { 
        messageLength: message.length,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },

  getProjectInsights: async (projectId: string) => {
    try {
      logSecurityEvent('ai_insights_request', { projectId });
      
      const response = await apiJson(`/ai/project/${projectId}/insights`);
      return response;
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
      logSecurityEvent('ai_report_generation', { 
        projectId,
        reportType,
      });
      
      const response = await apiJson('/ai/reports/generate', { method: 'POST', body: { projectId, reportType } });
      return response;
    } catch (error) {
      logSecurityEvent('ai_report_generation_error', { 
        projectId,
        reportType,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// Projects API functions using the new centralized client
export const projectsApi = {
  getAll: async () => {
    try {
      logSecurityEvent('projects_list_request');
      
      const response = await apiJson('/projects');
      return response;
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
      
      const response = await apiJson(`/projects/${id}`);
      return response;
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
      
      const response = await apiJson('/projects', { method: 'POST', body: data });
      return response;
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
      
      const response = await apiJson(`/projects/${id}`, { method: 'PATCH', body: data });
      return response;
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
      
      const response = await apiJson(`/projects/${id}`, { method: 'DELETE' });
      return response;
    } catch (error) {
      logSecurityEvent('project_deletion_error', { 
        projectId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};

// Feedback API functions using the new centralized client
export const feedbackApi = {
  submit: async (data: { type: string; content: string; metadata?: any }) => {
    try {
      logSecurityEvent('feedback_submission', { 
        type: data.type,
        contentLength: data.content.length,
        hasMetadata: !!data.metadata,
      });
      
      const response = await apiJson('/feedback', { method: 'POST', body: data });
      return response;
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
      
      const response = await apiJson('/feedback/statistics');
      return response;
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
      
      const response = await apiJson('/feedback');
      return response;
    } catch (error) {
      logSecurityEvent('feedback_list_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      throw error;
    }
  },
};
