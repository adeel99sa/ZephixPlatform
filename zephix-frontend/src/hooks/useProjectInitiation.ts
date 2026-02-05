import { useState } from 'react';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api/errors';

export interface UseProjectInitiationReturn {
  analyzeDocument: (file: File, type: string, orgContext: unknown) => Promise<unknown>;
  getProject: (projectId: string) => Promise<unknown>;
  updateCharter: (projectId: string, updates: unknown) => Promise<unknown>;
  exportProject: (projectId: string, options: unknown) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export const useProjectInitiation = (): UseProjectInitiationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = async (options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    data?: unknown;
    headers?: Record<string, string>;
  }) => {
    switch (options.method) {
      case 'GET':
        return api.get(options.url, { headers: options.headers });
      case 'POST':
        return api.post(options.url, options.data, { headers: options.headers });
      case 'PUT':
        return api.put(options.url, options.data, { headers: options.headers });
      case 'PATCH':
        return api.patch(options.url, options.data, { headers: options.headers });
      case 'DELETE':
        return api.delete(options.url, { headers: options.headers });
    }
  };

  const analyzeDocument = async (file: File, type: string, orgContext: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', type);
      formData.append('organizationContext', JSON.stringify(orgContext));

      const response = await apiCall({
        method: 'POST',
        url: '/pm/project-initiation/analyze',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProject = async (projectId: string) => {
    try {
      const response = await apiCall({
        method: 'GET',
        url: `/pm/project-initiation/${projectId}`,
      });
      return response;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const updateCharter = async (projectId: string, updates: unknown) => {
    try {
      const response = await apiCall({
        method: 'PUT',
        url: `/pm/project-initiation/${projectId}/charter`,
        data: updates,
      });
      return response;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const exportProject = async (projectId: string, options: unknown) => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: `/pm/project-initiation/${projectId}/export`,
        data: options,
      });
      return response;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  return {
    analyzeDocument,
    getProject,
    updateCharter,
    exportProject,
    loading,
    error,
  };
};
