import { useState } from 'react';
import api from '../services/api';

export interface UseProjectInitiationReturn {
  analyzeDocument: (file: File, type: string, orgContext: any) => Promise<any>;
  getProject: (projectId: string) => Promise<any>;
  updateCharter: (projectId: string, updates: any) => Promise<any>;
  exportProject: (projectId: string, options: any) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export const useProjectInitiation = (): UseProjectInitiationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = async (options: {
    method: string;
    url: string;
    data?: any;
    headers?: any;
  }) => {
    return api.get(options.url, {
      method: options.method,
      body: options.data,
      headers: options.headers,
    });
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

      return response.data;
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
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
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get project');
      throw err;
    }
  };

  const updateCharter = async (projectId: string, updates: any) => {
    try {
      const response = await apiCall({
        method: 'PUT',
        url: `/pm/project-initiation/${projectId}/charter`,
        data: updates,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update charter');
      throw err;
    }
  };

  const exportProject = async (projectId: string, options: any) => {
    try {
      const response = await apiCall({
        method: 'POST',
        url: `/pm/project-initiation/${projectId}/export`,
        data: options,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Export failed');
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
