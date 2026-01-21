// Phase 4.3: Analytics Widgets API Client with Workspace Header Enforcement
import { api } from "@/lib/api";
import { getWorkspaceHeader, WorkspaceRequiredError } from "./workspace-header";

/**
 * Get headers with workspace ID
 */
function getHeaders(): Record<string, string> {
  return getWorkspaceHeader();
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Response types matching backend DTOs
export interface ProjectHealthItem {
  projectId: string;
  projectName: string;
  status: string;
  riskLevel: string;
  conflictCount: number;
}

export type ProjectHealthData = ProjectHealthItem[];

export interface ResourceUtilizationItem {
  id: string;
  displayName: string;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  utilizationPercentage: number;
}

export type ResourceUtilizationData = ResourceUtilizationItem[];

export interface ConflictTrendsItem {
  week: string; // YYYY-MM-DD
  count: number;
}

export type ConflictTrendsData = ConflictTrendsItem[];

/**
 * Get project health widget data
 * Includes x-workspace-id header
 */
export async function getProjectHealth(dateRange: DateRange): Promise<ProjectHealthData> {
  try {
    const response = await api.get(`/api/analytics/widgets/project-health`, {
      params: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      headers: getHeaders(),
    });
    return response;
  } catch (error: any) {
    if (error instanceof WorkspaceRequiredError) {
      throw error;
    }
    throw error;
  }
}

/**
 * Get resource utilization widget data
 * Includes x-workspace-id header
 */
export async function getResourceUtilization(dateRange: DateRange): Promise<ResourceUtilizationData> {
  try {
    const response = await api.get(`/api/analytics/widgets/resource-utilization`, {
      params: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      headers: getHeaders(),
    });
    return response;
  } catch (error: any) {
    if (error instanceof WorkspaceRequiredError) {
      throw error;
    }
    throw error;
  }
}

/**
 * Get conflict trends widget data
 * Includes x-workspace-id header
 */
export async function getConflictTrends(dateRange: DateRange): Promise<ConflictTrendsData> {
  try {
    const response = await api.get(`/api/analytics/widgets/conflict-trends`, {
      params: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      headers: getHeaders(),
    });
    return response;
  } catch (error: any) {
    if (error instanceof WorkspaceRequiredError) {
      throw error;
    }
    throw error;
  }
}

