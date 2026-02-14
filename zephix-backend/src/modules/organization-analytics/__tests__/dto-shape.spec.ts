/**
 * Phase 4A: DTO Shape Tests
 *
 * Verifies default values and structure of all Phase 4A DTOs.
 */
import {
  OrgAnalyticsSummaryDto,
  toOrgAnalyticsSummaryDto,
} from '../dto/org-analytics-summary.dto';
import {
  OrgAnalyticsCapacityDto,
  toOrgAnalyticsCapacityDto,
} from '../dto/org-analytics-capacity.dto';
import {
  OrgAnalyticsStorageDto,
  toOrgAnalyticsStorageDto,
} from '../dto/org-analytics-storage.dto';
import {
  OrgAnalyticsScenariosDto,
  toOrgAnalyticsScenariosDto,
} from '../dto/org-analytics-scenarios.dto';
import {
  OrgAnalyticsAuditDto,
  toOrgAnalyticsAuditDto,
} from '../dto/org-analytics-audit.dto';

describe('OrgAnalyticsSummaryDto', () => {
  it('has correct defaults', () => {
    const dto = new OrgAnalyticsSummaryDto();
    expect(dto.workspaceCount).toBe(0);
    expect(dto.portfolioCount).toBe(0);
    expect(dto.projectCount).toBe(0);
    expect(dto.atRiskProjectsCount).toBe(0);
    expect(dto.evEligibleProjectsCount).toBe(0);
    expect(dto.aggregateCPI).toBeNull();
    expect(dto.aggregateSPI).toBeNull();
    expect(dto.totalBudget).toBe(0);
    expect(dto.totalActualCost).toBe(0);
    expect(dto.planCode).toBe('enterprise');
    expect(dto.planStatus).toBe('active');
    expect(dto.warnings).toEqual([]);
    expect(dto.timestamp).toBeDefined();
    expect(dto.lastUpdatedAt).toBeDefined();
  });

  it('toOrgAnalyticsSummaryDto overrides fields', () => {
    const dto = toOrgAnalyticsSummaryDto({ workspaceCount: 5, aggregateCPI: 0.95 });
    expect(dto.workspaceCount).toBe(5);
    expect(dto.aggregateCPI).toBe(0.95);
  });

  it('lastUpdatedAt is a parseable ISO date string', () => {
    const dto = toOrgAnalyticsSummaryDto({});
    expect(dto.lastUpdatedAt).toBeTruthy();
    expect(Date.parse(dto.lastUpdatedAt)).not.toBeNaN();
  });

  it('lastUpdatedAt matches timestamp', () => {
    const dto = toOrgAnalyticsSummaryDto({});
    expect(dto.lastUpdatedAt).toBe(dto.timestamp);
  });
});

describe('OrgAnalyticsCapacityDto', () => {
  it('has correct defaults', () => {
    const dto = new OrgAnalyticsCapacityDto();
    expect(dto.utilizationByWorkspace).toEqual([]);
    expect(dto.topOverallocatedUsers).toEqual([]);
    expect(dto.overallocationDaysTotal).toBe(0);
    expect(dto.warnings).toEqual([]);
    expect(dto.timestamp).toBeDefined();
  });

  it('toOrgAnalyticsCapacityDto overrides fields', () => {
    const dto = toOrgAnalyticsCapacityDto({ overallocationDaysTotal: 12 });
    expect(dto.overallocationDaysTotal).toBe(12);
  });
});

describe('OrgAnalyticsStorageDto', () => {
  it('has correct defaults', () => {
    const dto = new OrgAnalyticsStorageDto();
    expect(dto.totalUsedBytes).toBe(0);
    expect(dto.totalReservedBytes).toBe(0);
    expect(dto.maxStorageBytes).toBeNull();
    expect(dto.percentUsed).toBe(0);
    expect(dto.storageByWorkspace).toEqual([]);
    expect(dto.topWorkspacesByStorage).toEqual([]);
    expect(dto.warnings).toEqual([]);
    expect(dto.timestamp).toBeDefined();
  });
});

describe('OrgAnalyticsScenariosDto', () => {
  it('has correct defaults', () => {
    const dto = new OrgAnalyticsScenariosDto();
    expect(dto.scenarioCountTotal).toBe(0);
    expect(dto.scenarioCountLast30Days).toBe(0);
    expect(dto.computeRunsLast30Days).toBe(0);
    expect(dto.topScenarioWorkspaces).toEqual([]);
    expect(dto.warnings).toEqual([]);
    expect(dto.timestamp).toBeDefined();
  });
});

describe('OrgAnalyticsAuditDto', () => {
  it('has correct defaults', () => {
    const dto = new OrgAnalyticsAuditDto();
    expect(dto.auditEventsLast30Days).toBe(0);
    expect(dto.auditByAction).toEqual([]);
    expect(dto.auditByWorkspace).toEqual([]);
    expect(dto.warnings).toEqual([]);
    expect(dto.timestamp).toBeDefined();
  });
});
