/**
 * Phase 4A: Organization Analytics Scenarios DTO
 */

export interface TopScenarioWorkspace {
  workspaceId: string;
  scenarioCount: number;
}

export class OrgAnalyticsScenariosDto {
  scenarioCountTotal: number = 0;
  scenarioCountLast30Days: number = 0;
  computeRunsLast30Days: number = 0;
  topScenarioWorkspaces: TopScenarioWorkspace[] = [];
  warnings: string[] = [];
  timestamp: string = new Date().toISOString();
}

export function toOrgAnalyticsScenariosDto(
  data: Partial<OrgAnalyticsScenariosDto>,
): OrgAnalyticsScenariosDto {
  const dto = new OrgAnalyticsScenariosDto();
  Object.assign(dto, data);
  dto.timestamp = new Date().toISOString();
  return dto;
}
