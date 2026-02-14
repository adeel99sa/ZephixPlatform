/**
 * Phase 4A: Organization Analytics Storage DTO
 */

export interface WorkspaceStorageEntry {
  workspaceId: string;
  usedBytes: number;
  reservedBytes: number;
  limitBytes: number | null;
  percentUsed: number;
}

export class OrgAnalyticsStorageDto {
  totalUsedBytes: number = 0;
  totalReservedBytes: number = 0;
  maxStorageBytes: number | null = null;
  percentUsed: number = 0;
  storageByWorkspace: WorkspaceStorageEntry[] = [];
  topWorkspacesByStorage: WorkspaceStorageEntry[] = [];
  warnings: string[] = [];
  timestamp: string = new Date().toISOString();
}

export function toOrgAnalyticsStorageDto(
  data: Partial<OrgAnalyticsStorageDto>,
): OrgAnalyticsStorageDto {
  const dto = new OrgAnalyticsStorageDto();
  Object.assign(dto, data);
  dto.timestamp = new Date().toISOString();
  return dto;
}
