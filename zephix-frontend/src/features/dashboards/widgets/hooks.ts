// Phase 4.3: Widget Data Hooks
import { useState, useEffect } from "react";
import {
  getProjectHealth,
  getResourceUtilization,
  getConflictTrends,
  type ProjectHealthData,
  type ResourceUtilizationData,
  type ConflictTrendsData,
} from "../analytics-api";
import { WorkspaceRequiredError } from "../schemas";
import type { WidgetFilters, WidgetState, WidgetError } from "./types";

/**
 * useProjectHealth hook
 * Fetches project health data with caching guards
 */
export function useProjectHealth(filters: WidgetFilters): WidgetState<ProjectHealthData> {
  const [state, setState] = useState<WidgetState<ProjectHealthData>>({
    loading: false,
    error: null,
    data: null,
  });

  useEffect(() => {
    // Guard: Do not fetch until startDate and endDate exist
    if (!filters.startDate || !filters.endDate) {
      return;
    }

    // Guard: Do not fetch until workspace header exists (handled by API client)
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    getProjectHealth({
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
      .then((data) => {
        if (!cancelled) {
          setState({ loading: false, error: null, data });
        }
      })
      .catch((error: any) => {
        if (cancelled) return;

        const widgetError: WidgetError = {
          message: error?.response?.data?.message || error?.message || "Failed to load project health data",
          requestId: error?.response?.headers?.['x-request-id'],
        };

        setState({ loading: false, error: widgetError, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [filters.startDate, filters.endDate]);

  return state;
}

/**
 * useResourceUtilization hook
 * Fetches resource utilization data with caching guards
 */
export function useResourceUtilization(filters: WidgetFilters): WidgetState<ResourceUtilizationData> {
  const [state, setState] = useState<WidgetState<ResourceUtilizationData>>({
    loading: false,
    error: null,
    data: null,
  });

  useEffect(() => {
    // Guard: Do not fetch until startDate and endDate exist
    if (!filters.startDate || !filters.endDate) {
      return;
    }

    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    getResourceUtilization({
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
      .then((data) => {
        if (!cancelled) {
          setState({ loading: false, error: null, data });
        }
      })
      .catch((error: any) => {
        if (cancelled) return;

        const widgetError: WidgetError = {
          message: error?.response?.data?.message || error?.message || "Failed to load resource utilization data",
          requestId: error?.response?.headers?.['x-request-id'],
        };

        setState({ loading: false, error: widgetError, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [filters.startDate, filters.endDate]);

  return state;
}

/**
 * useConflictTrends hook
 * Fetches conflict trends data with caching guards
 */
export function useConflictTrends(filters: WidgetFilters): WidgetState<ConflictTrendsData> {
  const [state, setState] = useState<WidgetState<ConflictTrendsData>>({
    loading: false,
    error: null,
    data: null,
  });

  useEffect(() => {
    // Guard: Do not fetch until startDate and endDate exist
    if (!filters.startDate || !filters.endDate) {
      return;
    }

    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    getConflictTrends({
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
      .then((data) => {
        if (!cancelled) {
          setState({ loading: false, error: null, data });
        }
      })
      .catch((error: any) => {
        if (cancelled) return;

        const widgetError: WidgetError = {
          message: error?.response?.data?.message || error?.message || "Failed to load conflict trends data",
          requestId: error?.response?.headers?.['x-request-id'],
        };

        setState({ loading: false, error: widgetError, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [filters.startDate, filters.endDate]);

  return state;
}


