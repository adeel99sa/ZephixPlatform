/**
 * Phase 4A: Organization Analytics Service
 *
 * Cross-workspace executive analytics. Read-only aggregation.
 * All queries scoped by organizationId. No writes. No entity loading beyond aggregates.
 * Reuses existing tables via direct SQL for performance.
 */
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppLogger } from '../../../shared/logging/app-logger';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import {
  OrgAnalyticsSummaryDto,
  toOrgAnalyticsSummaryDto,
} from '../dto/org-analytics-summary.dto';
import {
  OrgAnalyticsCapacityDto,
  toOrgAnalyticsCapacityDto,
  WorkspaceWeeklyUtilization,
  OverallocatedUserEntry,
} from '../dto/org-analytics-capacity.dto';
import {
  OrgAnalyticsStorageDto,
  toOrgAnalyticsStorageDto,
  WorkspaceStorageEntry,
} from '../dto/org-analytics-storage.dto';
import {
  OrgAnalyticsScenariosDto,
  toOrgAnalyticsScenariosDto,
  TopScenarioWorkspace,
} from '../dto/org-analytics-scenarios.dto';
import {
  OrgAnalyticsAuditDto,
  toOrgAnalyticsAuditDto,
  AuditByActionEntry,
  AuditByWorkspaceEntry,
} from '../dto/org-analytics-audit.dto';

/** Performance thresholds for structured warnings */
const PERF_THRESHOLDS = {
  workspaces: 25,
  projects: 500,
  portfolios: 100,
};

/**
 * Optional tables that may not exist in all deployments.
 * The capability check is cached with a 5-minute TTL to avoid stale
 * process-global state while preventing per-request overhead.
 */
const OPTIONAL_TABLES = [
  'earned_value_snapshots',
  'workspace_member_capacity',
  'workspace_storage_usage',
  'scenario_plans',
  'scenario_results',
  'audit_events',
] as const;

type OptionalTable = (typeof OPTIONAL_TABLES)[number];

/** TTL for capability cache: 5 minutes */
const CAPABILITY_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class OrganizationAnalyticsService {
  private readonly logger = new AppLogger('OrganizationAnalytics');
  private readonly capsLogger = new AppLogger('ORG_ANALYTICS_CAPS');
  private capabilities: Map<string, boolean> | null = null;
  private capabilitiesExpiresAt = 0;

  constructor(
    @InjectDataSource()
    private readonly ds: DataSource,
    private readonly entitlementService: EntitlementService,
  ) {}

  /**
   * Checks which optional tables exist in the database.
   * Cached with a 5-minute TTL. Missing tables are logged once per
   * cache refresh with context ORG_ANALYTICS_CAPS.
   */
  async ensureCapabilities(): Promise<Map<string, boolean>> {
    if (this.capabilities && Date.now() < this.capabilitiesExpiresAt) {
      return this.capabilities;
    }

    const caps = new Map<string, boolean>();
    try {
      const rows = await this.ds.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
        [OPTIONAL_TABLES as unknown as string[]],
      );
      const found = new Set<string>(rows.map((r: any) => r.tablename));
      for (const t of OPTIONAL_TABLES) {
        caps.set(t, found.has(t));
      }
    } catch (err) {
      this.capsLogger.warn({
        action: 'capability_check_failed',
        error: (err as Error).message,
      });
      for (const t of OPTIONAL_TABLES) {
        caps.set(t, false);
      }
    }

    // Log missing tables once per cache refresh
    const missingTables = OPTIONAL_TABLES.filter((t) => !caps.get(t));
    if (missingTables.length > 0) {
      this.capsLogger.warn({
        action: 'missing_optional_tables',
        missingTables,
        missingCount: missingTables.length,
        totalOptional: OPTIONAL_TABLES.length,
      });
    }

    this.capabilities = caps;
    this.capabilitiesExpiresAt = Date.now() + CAPABILITY_CACHE_TTL_MS;
    return caps;
  }

  /** Invalidate capability cache (useful for testing). */
  resetCapabilityCache(): void {
    this.capabilities = null;
    this.capabilitiesExpiresAt = 0;
  }

  /** Returns true if an optional table is confirmed present. */
  private hasTable(caps: Map<string, boolean>, table: OptionalTable): boolean {
    return caps.get(table) === true;
  }

  // ─── A. Summary ──────────────────────────────────────────────

  async getSummary(organizationId: string): Promise<OrgAnalyticsSummaryDto> {
    const start = Date.now();
    const caps = await this.ensureCapabilities();
    const warnings: string[] = [];

    const evAvailable = this.hasTable(caps, 'earned_value_snapshots');
    if (!evAvailable) {
      warnings.push('earned_value_snapshots table not available — EV metrics skipped');
    }

    const [counts, evData, planCode, planStatus] = await Promise.all([
      this.getBasicCounts(organizationId),
      evAvailable ? this.getEvAggregates(organizationId) : Promise.resolve({
        evEligibleProjectsCount: 0,
        atRiskProjectsCount: 0,
        aggregateCPI: null,
        aggregateSPI: null,
        totalBudget: 0,
        totalActualCost: 0,
      }),
      this.entitlementService.getPlanCode(organizationId),
      this.entitlementService.getPlanStatus(organizationId),
    ]);

    const elapsed = Date.now() - start;
    this.logger.info({
      action: 'get_summary',
      organizationId,
      elapsedMs: elapsed,
    });

    if (counts.workspaceCount > PERF_THRESHOLDS.workspaces ||
        counts.projectCount > PERF_THRESHOLDS.projects) {
      this.logger.warn({
        action: 'large_org_aggregation',
        organizationId,
        workspaceCount: counts.workspaceCount,
        projectCount: counts.projectCount,
      });
    }

    return toOrgAnalyticsSummaryDto({
      ...counts,
      ...evData,
      planCode,
      planStatus,
      warnings,
    });
  }

  private async getBasicCounts(orgId: string) {
    const rows = await this.ds.query(
      `SELECT
        (SELECT COUNT(*)::int FROM workspaces WHERE organization_id = $1 AND deleted_at IS NULL) AS workspace_count,
        (SELECT COUNT(*)::int FROM portfolios WHERE organization_id = $1) AS portfolio_count,
        (SELECT COUNT(*)::int FROM projects WHERE organization_id = $1 AND deleted_at IS NULL) AS project_count
      `,
      [orgId],
    );
    const r = rows[0] || {};
    return {
      workspaceCount: r.workspace_count ?? 0,
      portfolioCount: r.portfolio_count ?? 0,
      projectCount: r.project_count ?? 0,
    };
  }

  /**
   * EV-eligible: projects with cost_tracking_enabled AND bac > 0.
   * CPI/SPI weighted by BAC. Only called when earned_value_snapshots capability confirmed.
   */
  private async getEvAggregates(orgId: string) {
    const rows = await this.ds.query(
      `SELECT
        COUNT(*)::int AS ev_eligible,
        COUNT(*) FILTER (WHERE latest_cpi < 0.9 OR latest_spi < 0.9) AS at_risk,
        CASE WHEN SUM(bac) > 0
          THEN ROUND((SUM(bac * latest_cpi) / NULLIF(SUM(bac), 0))::numeric, 4)
          ELSE NULL
        END AS weighted_cpi,
        CASE WHEN SUM(bac) > 0
          THEN ROUND((SUM(bac * latest_spi) / NULLIF(SUM(bac), 0))::numeric, 4)
          ELSE NULL
        END AS weighted_spi,
        COALESCE(SUM(bac), 0) AS total_budget,
        COALESCE(SUM(actual_cost), 0) AS total_actual_cost
      FROM (
        SELECT
          p.id,
          p.bac,
          COALESCE(p.actual_cost, 0) AS actual_cost,
          COALESCE(ev.cpi, 1) AS latest_cpi,
          COALESCE(ev.spi, 1) AS latest_spi
        FROM projects p
        LEFT JOIN LATERAL (
          SELECT cpi, spi FROM earned_value_snapshots
          WHERE project_id = p.id AND organization_id = $1
          ORDER BY snapshot_date DESC LIMIT 1
        ) ev ON true
        WHERE p.organization_id = $1
          AND p.deleted_at IS NULL
          AND p.cost_tracking_enabled = true
          AND COALESCE(p.bac, 0) > 0
      ) sub`,
      [orgId],
    );
    const r = rows[0] || {};
    return {
      evEligibleProjectsCount: r.ev_eligible ?? 0,
      atRiskProjectsCount: r.at_risk ?? 0,
      aggregateCPI: r.weighted_cpi !== null ? parseFloat(r.weighted_cpi) : null,
      aggregateSPI: r.weighted_spi !== null ? parseFloat(r.weighted_spi) : null,
      totalBudget: parseFloat(r.total_budget) || 0,
      totalActualCost: parseFloat(r.total_actual_cost) || 0,
    };
  }

  // ─── B. Capacity ─────────────────────────────────────────────

  async getCapacity(organizationId: string): Promise<OrgAnalyticsCapacityDto> {
    const start = Date.now();
    const caps = await this.ensureCapabilities();
    const warnings: string[] = [];

    if (!this.hasTable(caps, 'workspace_member_capacity')) {
      warnings.push('workspace_member_capacity table not available — capacity metrics skipped');
      this.logger.info({ action: 'get_capacity', organizationId, elapsedMs: Date.now() - start });
      return toOrgAnalyticsCapacityDto({ warnings });
    }

    const today = new Date();
    const eightWeeksLater = new Date(today);
    eightWeeksLater.setDate(eightWeeksLater.getDate() + 56);
    const fromDate = today.toISOString().slice(0, 10);
    const toDate = eightWeeksLater.toISOString().slice(0, 10);

    const [utilization, overallocated] = await Promise.all([
      this.getWeeklyUtilizationByWorkspace(organizationId, fromDate, toDate),
      this.getTopOverallocatedUsers(organizationId, fromDate, toDate),
    ]);

    const overallocationDaysTotal = overallocated.reduce(
      (sum, u) => sum + u.overallocatedDays,
      0,
    );

    const elapsed = Date.now() - start;
    this.logger.info({ action: 'get_capacity', organizationId, elapsedMs: elapsed });

    return toOrgAnalyticsCapacityDto({
      utilizationByWorkspace: utilization,
      topOverallocatedUsers: overallocated,
      overallocationDaysTotal,
      warnings,
    });
  }

  /** Only called when workspace_member_capacity capability is confirmed. */
  private async getWeeklyUtilizationByWorkspace(
    orgId: string,
    fromDate: string,
    toDate: string,
  ): Promise<WorkspaceWeeklyUtilization[]> {
    const rows = await this.ds.query(
      `SELECT
        c.workspace_id,
        COALESCE(w.name, c.workspace_id::text) AS workspace_name,
        DATE_TRUNC('week', c.date)::date AS week_start,
        SUM(c.capacity_hours)::numeric AS total_capacity,
        COALESCE(SUM(d.demand_hours), 0)::numeric AS total_demand
      FROM workspace_member_capacity c
      LEFT JOIN workspaces w ON w.id = c.workspace_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(
            CASE
              WHEN t.estimate_hours IS NOT NULL AND t.estimate_hours > 0
                THEN t.estimate_hours / GREATEST(1, (t.planned_end_at::date - t.planned_start_at::date))
              ELSE 8
            END
          ) AS demand_hours
        FROM work_tasks t
        WHERE t.organization_id = $1
          AND t.workspace_id = c.workspace_id
          AND t.assignee_id = c.user_id
          AND t.planned_start_at IS NOT NULL
          AND t.planned_end_at IS NOT NULL
          AND c.date BETWEEN t.planned_start_at::date AND t.planned_end_at::date
          AND t.deleted_at IS NULL
      ) d ON true
      WHERE c.organization_id = $1
        AND c.date BETWEEN $2 AND $3
      GROUP BY c.workspace_id, w.name, DATE_TRUNC('week', c.date)
      ORDER BY week_start, workspace_name`,
      [orgId, fromDate, toDate],
    );
    return rows.map((r: any) => ({
      workspaceId: r.workspace_id,
      workspaceName: r.workspace_name,
      weekStart: r.week_start?.toISOString?.() || String(r.week_start),
      totalCapacityHours: parseFloat(r.total_capacity) || 0,
      totalDemandHours: parseFloat(r.total_demand) || 0,
      utilization:
        parseFloat(r.total_capacity) > 0
          ? Math.round((parseFloat(r.total_demand) / parseFloat(r.total_capacity)) * 10000) / 10000
          : 0,
    }));
  }

  /** Only called when workspace_member_capacity capability is confirmed. */
  private async getTopOverallocatedUsers(
    orgId: string,
    fromDate: string,
    toDate: string,
  ): Promise<OverallocatedUserEntry[]> {
    const rows = await this.ds.query(
      `SELECT
        c.user_id,
        c.workspace_id,
        COUNT(*) FILTER (WHERE COALESCE(d.demand_hours, 0) > c.capacity_hours)::int AS overallocated_days,
        MAX(CASE WHEN c.capacity_hours > 0
          THEN COALESCE(d.demand_hours, 0) / c.capacity_hours
          ELSE 0
        END) AS peak_utilization
      FROM workspace_member_capacity c
      LEFT JOIN LATERAL (
        SELECT SUM(
          CASE
            WHEN t.estimate_hours IS NOT NULL AND t.estimate_hours > 0
              THEN t.estimate_hours / GREATEST(1, (t.planned_end_at::date - t.planned_start_at::date))
            ELSE 8
          END
        ) AS demand_hours
        FROM work_tasks t
        WHERE t.organization_id = $1
          AND t.workspace_id = c.workspace_id
          AND t.assignee_id = c.user_id
          AND t.planned_start_at IS NOT NULL
          AND t.planned_end_at IS NOT NULL
          AND c.date BETWEEN t.planned_start_at::date AND t.planned_end_at::date
          AND t.deleted_at IS NULL
      ) d ON true
      WHERE c.organization_id = $1
        AND c.date BETWEEN $2 AND $3
      GROUP BY c.user_id, c.workspace_id
      HAVING COUNT(*) FILTER (WHERE COALESCE(d.demand_hours, 0) > c.capacity_hours) > 0
      ORDER BY overallocated_days DESC
      LIMIT 20`,
      [orgId, fromDate, toDate],
    );
    return rows.map((r: any) => ({
      userId: r.user_id,
      workspaceId: r.workspace_id,
      overallocatedDays: r.overallocated_days ?? 0,
      peakUtilization: Math.round((parseFloat(r.peak_utilization) || 0) * 10000) / 10000,
    }));
  }

  // ─── C. Storage ──────────────────────────────────────────────

  async getStorage(organizationId: string): Promise<OrgAnalyticsStorageDto> {
    const start = Date.now();
    const caps = await this.ensureCapabilities();
    const warnings: string[] = [];

    if (!this.hasTable(caps, 'workspace_storage_usage')) {
      warnings.push('workspace_storage_usage table not available — storage metrics skipped');
      this.logger.info({ action: 'get_storage', organizationId, elapsedMs: Date.now() - start });
      return toOrgAnalyticsStorageDto({ warnings });
    }

    const [storageRows, maxStorageBytes] = await Promise.all([
      this.getStorageByWorkspace(organizationId),
      this.entitlementService.getLimit(organizationId, 'max_storage_bytes'),
    ]);

    const totalUsedBytes = storageRows.reduce((s, r) => s + r.usedBytes, 0);
    const totalReservedBytes = storageRows.reduce((s, r) => s + r.reservedBytes, 0);

    const storageByWorkspace: WorkspaceStorageEntry[] = storageRows.map((r) => ({
      ...r,
      limitBytes: maxStorageBytes,
      percentUsed:
        maxStorageBytes && maxStorageBytes > 0
          ? Math.round((r.usedBytes / maxStorageBytes) * 10000) / 100
          : 0,
    }));

    const topWorkspacesByStorage = [...storageByWorkspace]
      .sort((a, b) => b.usedBytes - a.usedBytes)
      .slice(0, 10);

    const elapsed = Date.now() - start;
    this.logger.info({ action: 'get_storage', organizationId, elapsedMs: elapsed });

    return toOrgAnalyticsStorageDto({
      totalUsedBytes,
      totalReservedBytes,
      maxStorageBytes,
      percentUsed:
        maxStorageBytes && maxStorageBytes > 0
          ? Math.round((totalUsedBytes / maxStorageBytes) * 10000) / 100
          : 0,
      storageByWorkspace,
      topWorkspacesByStorage,
      warnings,
    });
  }

  /** Only called when workspace_storage_usage capability is confirmed. */
  private async getStorageByWorkspace(
    orgId: string,
  ): Promise<Array<{ workspaceId: string; usedBytes: number; reservedBytes: number }>> {
    const rows = await this.ds.query(
      `SELECT workspace_id, COALESCE(used_bytes, 0)::bigint AS used_bytes,
              COALESCE(reserved_bytes, 0)::bigint AS reserved_bytes
       FROM workspace_storage_usage
       WHERE organization_id = $1
       ORDER BY used_bytes DESC`,
      [orgId],
    );
    return rows.map((r: any) => ({
      workspaceId: r.workspace_id,
      usedBytes: parseInt(r.used_bytes, 10) || 0,
      reservedBytes: parseInt(r.reserved_bytes, 10) || 0,
    }));
  }

  // ─── D. Scenarios ────────────────────────────────────────────

  async getScenarios(organizationId: string): Promise<OrgAnalyticsScenariosDto> {
    const start = Date.now();
    const caps = await this.ensureCapabilities();
    const warnings: string[] = [];

    const hasPlans = this.hasTable(caps, 'scenario_plans');
    const hasResults = this.hasTable(caps, 'scenario_results');

    if (!hasPlans) {
      warnings.push('scenario_plans table not available — scenario metrics skipped');
    }
    if (!hasResults) {
      warnings.push('scenario_results table not available — compute run metrics skipped');
    }

    if (!hasPlans) {
      this.logger.info({ action: 'get_scenarios', organizationId, elapsedMs: Date.now() - start });
      return toOrgAnalyticsScenariosDto({ warnings });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [total, last30, topWs, computeRuns] = await Promise.all([
      this.countScenarios(organizationId),
      this.countScenariosLast30Days(organizationId, thirtyDaysAgo),
      this.topScenarioWorkspaces(organizationId),
      hasResults
        ? this.countComputeRunsLast30Days(organizationId, thirtyDaysAgo)
        : Promise.resolve(0),
    ]);

    const elapsed = Date.now() - start;
    this.logger.info({ action: 'get_scenarios', organizationId, elapsedMs: elapsed });

    return toOrgAnalyticsScenariosDto({
      scenarioCountTotal: total,
      scenarioCountLast30Days: last30,
      computeRunsLast30Days: computeRuns,
      topScenarioWorkspaces: topWs,
      warnings,
    });
  }

  /** Only called when scenario_plans capability is confirmed. */
  private async countScenarios(orgId: string): Promise<number> {
    const r = await this.ds.query(
      `SELECT COUNT(*)::int AS cnt FROM scenario_plans WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId],
    );
    return r[0]?.cnt ?? 0;
  }

  /** Only called when scenario_plans capability is confirmed. */
  private async countScenariosLast30Days(orgId: string, since: string): Promise<number> {
    const r = await this.ds.query(
      `SELECT COUNT(*)::int AS cnt FROM scenario_plans
       WHERE organization_id = $1 AND deleted_at IS NULL AND created_at >= $2`,
      [orgId, since],
    );
    return r[0]?.cnt ?? 0;
  }

  /** Only called when scenario_plans capability is confirmed. */
  private async topScenarioWorkspaces(orgId: string): Promise<TopScenarioWorkspace[]> {
    const rows = await this.ds.query(
      `SELECT workspace_id, COUNT(*)::int AS scenario_count
       FROM scenario_plans
       WHERE organization_id = $1 AND deleted_at IS NULL
       GROUP BY workspace_id
       ORDER BY scenario_count DESC
       LIMIT 10`,
      [orgId],
    );
    return rows.map((r: any) => ({
      workspaceId: r.workspace_id,
      scenarioCount: r.scenario_count,
    }));
  }

  /** Only called when scenario_results capability is confirmed. */
  private async countComputeRunsLast30Days(orgId: string, since: string): Promise<number> {
    const r = await this.ds.query(
      `SELECT COUNT(*)::int AS cnt FROM scenario_results sr
       JOIN scenario_plans sp ON sr.scenario_id = sp.id
       WHERE sp.organization_id = $1 AND sr.computed_at >= $2`,
      [orgId, since],
    );
    return r[0]?.cnt ?? 0;
  }

  // ─── E. Audit ────────────────────────────────────────────────

  async getAuditSummary(organizationId: string): Promise<OrgAnalyticsAuditDto> {
    const start = Date.now();
    const caps = await this.ensureCapabilities();
    const warnings: string[] = [];

    if (!this.hasTable(caps, 'audit_events')) {
      warnings.push('audit_events table not available — audit metrics skipped');
      this.logger.info({ action: 'get_audit_summary', organizationId, elapsedMs: Date.now() - start });
      return toOrgAnalyticsAuditDto({ warnings });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [total, byAction, byWorkspace] = await Promise.all([
      this.countAuditLast30Days(organizationId, thirtyDaysAgo),
      this.auditByAction(organizationId, thirtyDaysAgo),
      this.auditByWorkspace(organizationId, thirtyDaysAgo),
    ]);

    const elapsed = Date.now() - start;
    this.logger.info({ action: 'get_audit_summary', organizationId, elapsedMs: elapsed });

    return toOrgAnalyticsAuditDto({
      auditEventsLast30Days: total,
      auditByAction: byAction,
      auditByWorkspace: byWorkspace,
      warnings,
    });
  }

  /** Only called when audit_events capability is confirmed. */
  private async countAuditLast30Days(orgId: string, since: string): Promise<number> {
    const r = await this.ds.query(
      `SELECT COUNT(*)::int AS cnt FROM audit_events
       WHERE organization_id = $1 AND created_at >= $2`,
      [orgId, since],
    );
    return r[0]?.cnt ?? 0;
  }

  /** Only called when audit_events capability is confirmed. */
  private async auditByAction(orgId: string, since: string): Promise<AuditByActionEntry[]> {
    const rows = await this.ds.query(
      `SELECT action, COUNT(*)::int AS count
       FROM audit_events
       WHERE organization_id = $1 AND created_at >= $2
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`,
      [orgId, since],
    );
    return rows.map((r: any) => ({ action: r.action, count: r.count }));
  }

  /** Only called when audit_events capability is confirmed. */
  private async auditByWorkspace(orgId: string, since: string): Promise<AuditByWorkspaceEntry[]> {
    const rows = await this.ds.query(
      `SELECT workspace_id, COUNT(*)::int AS count
       FROM audit_events
       WHERE organization_id = $1 AND workspace_id IS NOT NULL AND created_at >= $2
       GROUP BY workspace_id
       ORDER BY count DESC
       LIMIT 10`,
      [orgId, since],
    );
    return rows.map((r: any) => ({ workspaceId: r.workspace_id, count: r.count }));
  }

  // ─── Performance check ───────────────────────────────────────

  /** Returns true if org exceeds performance thresholds */
  async isLargeOrg(organizationId: string): Promise<boolean> {
    const counts = await this.getBasicCounts(organizationId);
    return (
      counts.workspaceCount > PERF_THRESHOLDS.workspaces ||
      counts.projectCount > PERF_THRESHOLDS.projects
    );
  }
}
