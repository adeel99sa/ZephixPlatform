import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface ProjectGenerationRequest {
  methodology: string;
  customSettings?: any;
}

export interface ProjectGenerationResponse {
  projectId: string;
  message: string;
  estimatedTime: number;
}

export interface ProjectGenerationStatus {
  projectId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  error?: string;
  result?: any;
}

export const useProjectGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateProject = useCallback(async (
    documentId: string, 
    methodology: string, 
    customSettings?: any
  ): Promise<ProjectGenerationResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: ProjectGenerationRequest = {
        methodology,
        customSettings,
      };

      const response = await api.post(`/api/v1/projects/generate-from-document/${documentId}`, payload);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate project';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkProjectStatus = useCallback(async (projectId: string): Promise<ProjectGenerationStatus> => {
    try {
      const response = await api.get(`/api/v1/projects/generation-status/${projectId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check project generation status';
      throw new Error(errorMessage);
    }
  }, []);

  const getProjectDetails = useCallback(async (projectId: string): Promise<any> => {
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to get project details';
      throw new Error(errorMessage);
    }
  }, []);

  return {
    generateProject,
    checkProjectStatus,
    getProjectDetails,
    isLoading,
    error,
  };
};
