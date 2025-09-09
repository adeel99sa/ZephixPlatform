import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const data = JSON.parse(authStorage);
        const token = data.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Invalid storage, ignore
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth-storage
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Add backward compatibility for authStore
export const apiJson = async (url: string, options: any = {}) => {
  const config = {
    url,
    method: options.method || 'GET',
    data: options.body,
    ...options
  };
  
  const response = await api(config);
  return response.data;
};

// Add this line at the end of api.ts
export { api };