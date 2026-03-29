import { useEffect, useMemo, useState } from 'react';
import { getProjectHealth } from '../analytics-api';
import type { WidgetError, WidgetFilters } from './types';
import {
  MOCK_PROJECTS_AT_RISK_DATA,
  type ProjectsAtRiskWidgetData,
} from './projects-at-risk-data';
import { mapProjectHealthToAtRisk } from './projects-at-risk-map';

function defaultDateRange(): Pick<WidgetFilters, 'startDate' | 'endDate'> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 90);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export interface UseProjectsAtRiskOptions {
  filters: WidgetFilters;
  /** When true, skip network and return {@link MOCK_PROJECTS_AT_RISK_DATA}. */
  useMock?: boolean;
}

export interface UseProjectsAtRiskResult {
  loading: boolean;
  error: WidgetError | null;
  data: ProjectsAtRiskWidgetData | null;
}

/**
 * Loads Projects At Risk payload: mock (env or prop) or live project-health rollup.
 */
export function useProjectsAtRisk(options: UseProjectsAtRiskOptions): UseProjectsAtRiskResult {
  const { filters, useMock: useMockProp } = options;
  const envMock = import.meta.env.VITE_MOCK_PROJECTS_AT_RISK === 'true';
  const useMock = Boolean(useMockProp || envMock);

  const range = useMemo(() => {
    if (filters.startDate && filters.endDate) {
      return { startDate: filters.startDate, endDate: filters.endDate };
    }
    return defaultDateRange();
  }, [filters.startDate, filters.endDate]);

  const [state, setState] = useState<UseProjectsAtRiskResult>({
    loading: !useMock,
    error: null,
    data: useMock ? MOCK_PROJECTS_AT_RISK_DATA : null,
  });

  useEffect(() => {
    if (useMock) {
      setState({ loading: false, error: null, data: MOCK_PROJECTS_AT_RISK_DATA });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    getProjectHealth(range)
      .then((items) => {
        if (cancelled) return;
        const mapped = mapProjectHealthToAtRisk(items);
        const filtered = {
          ...mapped,
          projects: mapped.projects.filter((p) => p.riskLevel !== 'healthy'),
        };
        setState({
          loading: false,
          error: null,
          data: {
            totalProjects: mapped.totalProjects,
            atRiskCount: filtered.projects.length,
            projects: filtered.projects.slice(0, 8),
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error as { response?: { data?: { message?: string }; headers?: Record<string, string> }; message?: string };
        setState({
          loading: false,
          error: {
            message: err?.response?.data?.message || err?.message || 'Failed to load projects at risk',
            requestId: err?.response?.headers?.['x-request-id'],
          },
          data: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [useMock, range.startDate, range.endDate]);

  return state;
}
