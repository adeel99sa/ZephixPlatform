import { getApiUrl } from '../config/api.config';

const getAuthToken = () => localStorage.getItem('token');

export const apiJson = async (endpoint: string, options: RequestInit = {}) => {
  const url = getApiUrl(endpoint);
  const token = getAuthToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Cannot ${options.method || 'GET'} ${endpoint}`);
  }

  return response.json();
};

export const projectsApi = {
  getAll: () => apiJson('projects'),
  create: (data: any) => apiJson('projects', { method: 'POST', body: data }),
  update: (id: string, data: any) => apiJson(`projects/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiJson(`projects/${id}`, { method: 'DELETE' }),
};

export const authApi = {
  login: (data: any) => apiJson('auth/login', { method: 'POST', body: data }),
  signup: (data: any) => apiJson('auth/signup', { method: 'POST', body: data }),
  refresh: (token: string) => apiJson('auth/refresh', { method: 'POST', body: { token } }),
};
