import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '../services/api.service';

export interface DocumentUploadResponse {
  jobId: string;
  documentId: string;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useDocumentProcessing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processDocument = useCallback(async (file: File): Promise<DocumentUploadResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiPost('/api/v1/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (jobId: string): Promise<JobStatusResponse> => {
    try {
      const response = await apiGet(`/api/v1/documents/status/${jobId}`);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check job status';
      throw new Error(errorMessage);
    }
  }, []);

  const getDocumentResults = useCallback(async (jobId: string): Promise<any> => {
    try {
      const response = await apiGet(`/api/v1/documents/results/${jobId}`);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to get document results';
      throw new Error(errorMessage);
    }
  }, []);

  return {
    processDocument,
    checkStatus,
    getDocumentResults,
    isLoading,
    error,
  };
};
