/**
 * Phase 4A: Organization Analytics Summary DTO
 */
import { PlanCode } from '../../billing/entitlements/plan-code.enum';

export class OrgAnalyticsSummaryDto {
  workspaceCount: number = 0;
  portfolioCount: number = 0;
  projectCount: number = 0;
  atRiskProjectsCount: number = 0;
  evEligibleProjectsCount: number = 0;
  aggregateCPI: number | null = null;
  aggregateSPI: number | null = null;
  totalBudget: number = 0;
  totalActualCost: number = 0;
  planCode: PlanCode = 'enterprise' as PlanCode;
  planStatus: string = 'active';
  warnings: string[] = [];
  timestamp: string = new Date().toISOString();
  lastUpdatedAt: string = new Date().toISOString();
}

export function toOrgAnalyticsSummaryDto(
  data: Partial<OrgAnalyticsSummaryDto>,
): OrgAnalyticsSummaryDto {
  const dto = new OrgAnalyticsSummaryDto();
  Object.assign(dto, data);
  const now = new Date().toISOString();
  dto.timestamp = now;
  dto.lastUpdatedAt = now;
  return dto;
}
