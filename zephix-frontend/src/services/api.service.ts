import { getApiUrl } from '../config/api.config';

const getAuthToken = () => localStorage.getItem('token');

export const apiRequest = async (endpoint: string, options: any = {}) => {
  const url = getApiUrl(endpoint);
  const token = getAuthToken();
  
  // Handle the body - check if it needs stringifying
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }
  
  const response = await fetch(url, {
    ...options,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let error;
    try {
      error = await response.json();
    } catch {
      error = await response.text();
    }
    throw new Error(error?.message || error || `Request failed: ${response.status}`);
  }

  return response.json();
};

// Named exports for different HTTP methods
export const apiGet = (endpoint: string) => 
  apiRequest(endpoint, { method: 'GET' });

export const apiPost = (endpoint: string, data: any) => 
  apiRequest(endpoint, { 
    method: 'POST', 
    body: data  // Don't stringify here, apiRequest handles it
  });

export const apiPut = (endpoint: string, data: any) => 
  apiRequest(endpoint, { 
    method: 'PUT', 
    body: data  // Don't stringify here
  });

export const apiDelete = (endpoint: string) => 
  apiRequest(endpoint, { method: 'DELETE' });

// For backward compatibility during migration
export const apiJson = apiRequest;