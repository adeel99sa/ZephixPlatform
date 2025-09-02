import { useState, useCallback } from 'react';
import { apiRequest } from '../services/api.service';

export interface UseStatusReportingReturn {
  generateReport: (config: any) => Promise<any>;
  getMetrics: (projectId: string) => Promise<any>;
  getTrends: (projectId: string) => Promise<any>;
  exportReport: (reportId: string, format: string) => Promise<any>;
  configureAlerts: (projectId: string, config: any) => Promise<any>;
  loading: boolean;
  error: string | null;
}

export const useStatusReporting = (): UseStatusReportingReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (config: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest('/pm/status-reporting/generate', {
        method: 'POST',
        body: config,
      });
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMetrics = useCallback(async (projectId: string) => {
    try {
      return await apiRequest(`/pm/status-reporting/${projectId}/metrics`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      throw err;
    }
  }, []);

  const getTrends = useCallback(async (projectId: string) => {
    try {
      return await apiRequest(`/pm/status-reporting/${projectId}/trends`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
      throw err;
    }
  }, []);

  const exportReport = useCallback(async (reportId: string, format: string) => {
    try {
      return await apiRequest(`/pm/status-reporting/${reportId}/export`, {
        method: 'POST',
        body: { format, stakeholderType: 'executive' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
      throw err;
    }
  }, []);

  const configureAlerts = useCallback(async (projectId: string, config: any) => {
    try {
      return await apiRequest(`/pm/status-reporting/${projectId}/alerts/configure`, {
        method: 'POST',
        body: config,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure alerts');
      throw err;
    }
  }, []);

  return {
    generateReport,
    getMetrics,
    getTrends,
    exportReport,
    configureAlerts,
    loading,
    error,
  };
};
