import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  ResourceTimelinePoint,
  TimelineApiResponse,
  HeatmapApiResponse,
  HeatmapResponse,
  HeatmapResourceRow,
  HeatmapCell,
} from '@/types/resourceTimeline';

export type Resource = {
  id: string;
  name: string;
  email?: string;
  role: string;
  skills?: string[];
  dept?: string;
  location?: string;
  availabilityPct?: number;
  capacityHoursPerWeek?: number;
  isActive?: boolean;
};
export type ResourceList = { items: Resource[]; total: number; page: number; pageSize: number };

export type ResourceListFilters = {
  search?: string;
  dept?: string;
  skills?: string[];
  roles?: string[];
  workspaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export function useResourcesList(params: ResourceListFilters) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: async () => {
      // Build query params, handling array values
      const queryParams: Record<string, unknown> = {
        page: params.page,
        pageSize: params.pageSize,
      };

      if (params.search) queryParams.search = params.search;
      if (params.dept) queryParams.dept = params.dept;
      if (params.skills && params.skills.length > 0) {
        queryParams.skills = params.skills.join(',');
      }
      if (params.roles && params.roles.length > 0) {
        queryParams.roles = params.roles.join(',');
      }
      if (params.workspaceId) queryParams.workspaceId = params.workspaceId;
      if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
      if (params.dateTo) queryParams.dateTo = params.dateTo;

      const response = await apiClient.get<Resource[] | { data: Resource[] }>('/resources', {
        params: queryParams,
      });

      // Handle response format: { data: { data: Resource[] } } or { data: Resource[] }
      const responseData = response.data as unknown;
      const nestedData = responseData as { data?: Resource[] };
      const resources = nestedData?.data || (Array.isArray(responseData) ? responseData : []);

      return {
        items: Array.isArray(resources) ? resources : [],
        total: Array.isArray(resources) ? resources.length : 0,
        page: params.page,
        pageSize: params.pageSize,
      } as ResourceList;
    },
    staleTime: 30_000,
  });
}

export type CapacitySummary = {
  id: string;
  displayName: string;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  utilizationPercentage: number;
};

export function useCapacitySummary(
  dateFrom: string,
  dateTo: string,
  workspaceId?: string,
) {
  return useQuery({
    queryKey: ['capacity-summary', dateFrom, dateTo, workspaceId],
    queryFn: async () => {
      const params: Record<string, string> = { dateFrom, dateTo };
      if (workspaceId) params.workspaceId = workspaceId;

      const response = await apiClient.get<CapacitySummary[] | { data: CapacitySummary[] }>('/resources/capacity-summary', {
        params,
      });

      const responseData = response.data as unknown;
      const nestedData = responseData as { data?: CapacitySummary[] };
      return nestedData?.data || (Array.isArray(responseData) ? responseData : []) as CapacitySummary[];
    },
    enabled: !!dateFrom && !!dateTo,
    staleTime: 30_000,
  });
}

export type CapacityBreakdown = {
  projectId: string;
  projectName: string;
  workspaceId: string;
  totalAllocatedHours: number;
  percentageOfResourceTime: number;
};

export function useCapacityBreakdown(
  resourceId: string | null,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery({
    queryKey: ['capacity-breakdown', resourceId, dateFrom, dateTo],
    queryFn: async () => {
      if (!resourceId) return [];

      const response = await apiClient.get<CapacityBreakdown[] | { data: CapacityBreakdown[] }>(`/resources/${resourceId}/capacity-breakdown`, {
        params: { dateFrom, dateTo },
      });

      const responseData = response.data as unknown;
      const nestedData = responseData as { data?: CapacityBreakdown[] };
      return nestedData?.data || (Array.isArray(responseData) ? responseData : []) as CapacityBreakdown[];
    },
    enabled: !!resourceId && !!dateFrom && !!dateTo,
    staleTime: 30_000,
  });
}

export type SkillFacet = {
  name: string;
  count: number;
};

export function useSkillsFacet() {
  return useQuery({
    queryKey: ['skills-facet'],
    queryFn: async () => {
      const response = await apiClient.get<SkillFacet[] | { data: SkillFacet[] }>('/resources/skills');
      const responseData = response.data as unknown;
      const nestedData = responseData as { data?: SkillFacet[] };
      return nestedData?.data || (Array.isArray(responseData) ? responseData : []) as SkillFacet[];
    },
    staleTime: 60_000, // Skills change less frequently
  });
}

export function useResourceAllocations(resourceId: string, weeks = 8) {
  return useQuery({
    queryKey: ['resource-allocs', resourceId, weeks],
    queryFn: async () => {
      const response = await apiClient.get<Array<{ week: string; pct: number }>>(`/resources/${resourceId}/allocations`, {
        params: { weeks },
      });
      return response.data as Array<{ week: string; pct: number }>;
    },
  });
}

export type ResourceRiskScore = {
  resourceId: string;
  resourceName: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  topFactors: string[];
  metrics: {
    avgAllocation: number;
    maxAllocation: number;
    daysOver100: number;
    daysOver120: number;
    daysOver150: number;
    maxConcurrentProjects: number;
    existingConflictsCount: number;
  };
};

export function useResourceRiskScore(
  resourceId: string | null,
  dateFrom: string,
  dateTo: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ['resource-risk-score', resourceId, dateFrom, dateTo],
    queryFn: async () => {
      if (!resourceId) return null;

      try {
        const response = await apiClient.get<ResourceRiskScore | { data: ResourceRiskScore }>(`/resources/${resourceId}/risk-score`, {
          params: { dateFrom, dateTo },
        });
        const responseData = response.data as unknown;
        const nestedData = responseData as { data?: ResourceRiskScore };
        return (nestedData?.data || responseData) as ResourceRiskScore;
      } catch (error: unknown) {
        // Treat 404 as feature disabled, not an error
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && !!resourceId && !!dateFrom && !!dateTo,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      // Don't retry on 404 (feature disabled)
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export type WorkspaceRiskSummary = {
  workspaceId: string;
  workspaceName: string;
  summary: {
    totalResources: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    averageRiskScore: number;
  };
  highRiskResources: Array<{
    resourceId: string;
    resourceName: string;
    riskScore: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    topFactors: string[];
  }>;
};

export function useWorkspaceResourceRiskSummary(
  workspaceId: string | null,
  dateFrom: string,
  dateTo: string,
  limit?: number,
  minRiskScore?: number,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ['workspace-risk-summary', workspaceId, dateFrom, dateTo, limit, minRiskScore],
    queryFn: async () => {
      if (!workspaceId) return null;

      try {
        const params: Record<string, unknown> = { dateFrom, dateTo };
        if (limit !== undefined) params.limit = limit;
        if (minRiskScore !== undefined) params.minRiskScore = minRiskScore;

        const response = await apiClient.get<WorkspaceRiskSummary | { data: WorkspaceRiskSummary }>(`/workspaces/${workspaceId}/resource-risk-summary`, {
          params,
        });
        const responseData = response.data as unknown;
        const nestedData = responseData as { data?: WorkspaceRiskSummary };
        return (nestedData?.data || responseData) as WorkspaceRiskSummary;
      } catch (error: unknown) {
        // Treat 404 as feature disabled, not an error
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && !!workspaceId && !!dateFrom && !!dateTo,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      // Don't retry on 404 (feature disabled)
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Fetch resource timeline data
 */
export async function fetchResourceTimeline(
  resourceId: string,
  fromDate: string,
  toDate: string,
): Promise<ResourceTimelinePoint[]> {
  const response = await apiClient.get<TimelineApiResponse>(
    `/resources/${resourceId}/timeline`,
    {
      params: { fromDate, toDate },
    },
  );
  // Handle response format: { data: [...] } from ResponseService.success()
  const responseData = response.data as unknown;
  const nestedData = responseData as { data?: ResourceTimelinePoint[] };
  return (nestedData?.data || (Array.isArray(responseData) ? responseData : [])) as ResourceTimelinePoint[];
}

/**
 * Fetch resource heatmap data
 */
export async function fetchResourceHeatmap(
  workspaceId: string | undefined,
  fromDate: string,
  toDate: string,
): Promise<HeatmapResponse> {
  const params: Record<string, string> = { fromDate, toDate };
  if (workspaceId) params.workspaceId = workspaceId;

  const response = await apiClient.get<HeatmapApiResponse>(
    '/resources/heatmap/timeline',
    {
      params,
    },
  );

  // Handle response format: { data: { data: [...] } } or { data: [...] }
  // Backend uses ResponseService.success() which wraps in { data: [...] }
  type HeatmapDayData = {
    date: string;
    resources: Array<{
      resourceId: string;
      resourceName: string;
      hardLoad: number;
      softLoad: number;
      classification: 'NONE' | 'WARNING' | 'CRITICAL';
    }>;
  };
  const responseData = response.data as unknown;
  const nestedData = responseData as { data?: HeatmapDayData[] };
  const apiData = (nestedData?.data || (Array.isArray(responseData) ? responseData : [])) as HeatmapDayData[];

  // Extract unique resources and dates
  const resourceMap = new Map<string, HeatmapResourceRow>();
  const dateSet = new Set<string>();
  const cells: HeatmapCell[] = [];

  for (const day of apiData) {
    if (!day.date || !day.resources) continue;

    dateSet.add(day.date);

    for (const resource of day.resources) {
      // Add resource to map if not seen
      if (!resourceMap.has(resource.resourceId)) {
        resourceMap.set(resource.resourceId, {
          resourceId: resource.resourceId,
          displayName: resource.resourceName || `Resource ${resource.resourceId.slice(0, 8)}`,
          role: undefined, // Backend doesn't provide role in heatmap response
        });
      }

      // Add cell
      cells.push({
        resourceId: resource.resourceId,
        date: day.date,
        capacityPercent: 100, // Default, backend may not provide this
        hardLoadPercent: resource.hardLoad || 0,
        softLoadPercent: resource.softLoad || 0,
        classification: resource.classification || 'NONE',
      });
    }
  }

  return {
    resources: Array.from(resourceMap.values()),
    dates: Array.from(dateSet).sort(),
    cells,
  };
}

/**
 * React Query hook for resource timeline
 */
export function useResourceTimeline(
  resourceId: string | null,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: ['resource-timeline', resourceId, fromDate, toDate],
    queryFn: () => fetchResourceTimeline(resourceId!, fromDate, toDate),
    enabled: !!resourceId && !!fromDate && !!toDate,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * React Query hook for resource heatmap
 */
export function useResourceHeatmap(
  workspaceId: string | undefined,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: ['resource-heatmap', workspaceId, fromDate, toDate],
    queryFn: () => fetchResourceHeatmap(workspaceId, fromDate, toDate),
    enabled: !!fromDate && !!toDate,
    staleTime: 30_000, // 30 seconds
  });
}
