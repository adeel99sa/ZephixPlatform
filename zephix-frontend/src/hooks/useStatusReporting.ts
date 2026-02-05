import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface ReportResult {
  reportId: string;
  status?: string;
}

export interface ExportResult {
  downloadUrl: string;
}

export type MetricsData = Record<string, unknown>;
export type TrendsData = unknown[];

export interface UseStatusReportingReturn {
  generateReport: (config: unknown) => Promise<ReportResult>;
  getMetrics: (projectId: string) => Promise<MetricsData>;
  getTrends: (projectId: string) => Promise<TrendsData>;
  exportReport: (reportId: string, format: string, stakeholderType?: string) => Promise<ExportResult>;
  configureAlerts: (projectId: string, config: unknown) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export const useStatusReporting = (): UseStatusReportingReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (config: unknown): Promise<ReportResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.post('/pm/status-reporting/generate', config) as ReportResult;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMetrics = useCallback(async (projectId: string): Promise<MetricsData> => {
    try {
      return await api.get(`/pm/status-reporting/${projectId}/metrics`) as MetricsData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      throw err;
    }
  }, []);

  const getTrends = useCallback(async (projectId: string): Promise<TrendsData> => {
    try {
      return await api.get(`/pm/status-reporting/${projectId}/trends`) as TrendsData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
      throw err;
    }
  }, []);

  const exportReport = useCallback(async (reportId: string, format: string, stakeholderType = 'executive'): Promise<ExportResult> => {
    try {
      const result = await api.post(`/pm/status-reporting/${reportId}/export`, { format, stakeholderType }) as ExportResult;
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
      throw err;
    }
  }, []);

  const configureAlerts = useCallback(async (projectId: string, config: unknown) => {
    try {
      return await api.post(`/pm/status-reporting/${projectId}/alerts/configure`, config);
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
