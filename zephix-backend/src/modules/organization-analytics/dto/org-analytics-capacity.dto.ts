/**
 * Phase 4A: Organization Analytics Capacity DTO
 */

export interface WorkspaceWeeklyUtilization {
  workspaceId: string;
  workspaceName: string;
  weekStart: string;
  totalCapacityHours: number;
  totalDemandHours: number;
  utilization: number;
}

export interface OverallocatedUserEntry {
  userId: string;
  workspaceId: string;
  overallocatedDays: number;
  peakUtilization: number;
}

export class OrgAnalyticsCapacityDto {
  utilizationByWorkspace: WorkspaceWeeklyUtilization[] = [];
  topOverallocatedUsers: OverallocatedUserEntry[] = [];
  overallocationDaysTotal: number = 0;
  warnings: string[] = [];
  timestamp: string = new Date().toISOString();
}

export function toOrgAnalyticsCapacityDto(
  data: Partial<OrgAnalyticsCapacityDto>,
): OrgAnalyticsCapacityDto {
  const dto = new OrgAnalyticsCapacityDto();
  Object.assign(dto, data);
  dto.timestamp = new Date().toISOString();
  return dto;
}
