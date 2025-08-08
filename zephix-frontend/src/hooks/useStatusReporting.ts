import { useState, useCallback } from 'react';

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
      const response = await fetch('/api/pm/status-reporting/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
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
      const response = await fetch(`/api/pm/status-reporting/${projectId}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      throw err;
    }
  }, []);

  const getTrends = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/pm/status-reporting/${projectId}/trends`);
      if (!response.ok) throw new Error('Failed to fetch trends');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
      throw err;
    }
  }, []);

  const exportReport = useCallback(async (reportId: string, format: string) => {
    try {
      const response = await fetch(`/api/pm/status-reporting/${reportId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format, stakeholderType: 'executive' }),
      });
      if (!response.ok) throw new Error('Failed to export report');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
      throw err;
    }
  }, []);

  const configureAlerts = useCallback(async (projectId: string, config: any) => {
    try {
      const response = await fetch(`/api/pm/status-reporting/${projectId}/alerts/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to configure alerts');
      return await response.json();
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
