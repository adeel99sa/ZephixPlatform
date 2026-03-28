/**
 * Phase 4A: Organization Analytics Audit DTO
 */

export interface AuditByActionEntry {
  action: string;
  count: number;
}

export interface AuditByWorkspaceEntry {
  workspaceId: string;
  count: number;
}

export class OrgAnalyticsAuditDto {
  auditEventsLast30Days: number = 0;
  auditByAction: AuditByActionEntry[] = [];
  auditByWorkspace: AuditByWorkspaceEntry[] = [];
  warnings: string[] = [];
  timestamp: string = new Date().toISOString();
}

export function toOrgAnalyticsAuditDto(
  data: Partial<OrgAnalyticsAuditDto>,
): OrgAnalyticsAuditDto {
  const dto = new OrgAnalyticsAuditDto();
  Object.assign(dto, data);
  dto.timestamp = new Date().toISOString();
  return dto;
}
