import { Injectable, Logger } from '@nestjs/common';
import { CapacityCalendarService, DEFAULT_CAPACITY_HOURS } from './capacity-calendar.service';
import { DemandModelService, DailyDemandEntry } from './demand-model.service';

/**
 * Phase 2E: Capacity Analytics Service
 *
 * Computes utilization, overallocation detection, and workspace summaries
 * from capacity calendar + demand model data.
 */

/** Default utilization threshold — configurable per query */
export const DEFAULT_UTILIZATION_THRESHOLD = 1.0;
export const MIN_THRESHOLD = 0.5;
export const MAX_THRESHOLD = 2.0;

export interface UserDailyUtilization {
  userId: string;
  date: string;
  capacityHours: number;
  demandHours: number;
  utilization: number; // demandHours / capacityHours
  overByHours: number; // max(0, demandHours - capacityHours * threshold)
}

export interface UserWeeklyRollup {
  userId: string;
  weekStartDate: string; // Monday
  totalCapacityHours: number;
  totalDemandHours: number;
  averageUtilization: number;
  peakDayUtilization: number;
  overallocatedDays: number;
}

export interface UtilizationResult {
  perUserDaily: UserDailyUtilization[];
  perUserWeekly: UserWeeklyRollup[];
  workspaceSummary: {
    totalCapacityHours: number;
    totalDemandHours: number;
    averageUtilization: number;
    overallocatedUserCount: number;
  };
}

export interface OverallocationEntry {
  userId: string;
  date: string;
  capacityHours: number;
  demandHours: number;
  overByHours: number;
  tasks: Array<{
    taskId?: string;
    projectId: string;
    demandHours: number;
    source: string;
  }>;
}

export interface OverallocationResult {
  entries: OverallocationEntry[];
  totalOverallocatedDays: number;
  affectedUserCount: number;
}

@Injectable()
export class CapacityAnalyticsService {
  private readonly logger = new Logger(CapacityAnalyticsService.name);

  constructor(
    private readonly calendarService: CapacityCalendarService,
    private readonly demandService: DemandModelService,
  ) {}

  /** Clamp threshold to allowed range */
  static clampThreshold(threshold?: number): number {
    if (threshold == null) return DEFAULT_UTILIZATION_THRESHOLD;
    return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, threshold));
  }

  /**
   * Compute utilization for users in a workspace over a date range.
   */
  async computeUtilization(opts: {
    organizationId: string;
    workspaceId: string;
    fromDate: string;
    toDate: string;
    userIds?: string[];
    threshold?: number;
    includeDisabled?: boolean;
  }): Promise<UtilizationResult> {
    const threshold = CapacityAnalyticsService.clampThreshold(opts.threshold);
    const startMs = Date.now();

    // Get demand
    const demandResult = await this.demandService.buildDailyDemand({
      organizationId: opts.organizationId,
      workspaceId: opts.workspaceId,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      userIds: opts.userIds,
      includeDisabled: opts.includeDisabled,
    });

    // Collect all user IDs from demand entries
    const userIdSet = new Set<string>();
    for (const e of demandResult.entries) {
      userIdSet.add(e.userId);
    }
    if (opts.userIds) {
      for (const uid of opts.userIds) {
        userIdSet.add(uid);
      }
    }
    const userIds = [...userIdSet];

    if (userIds.length === 0) {
      return {
        perUserDaily: [],
        perUserWeekly: [],
        workspaceSummary: {
          totalCapacityHours: 0,
          totalDemandHours: 0,
          averageUtilization: 0,
          overallocatedUserCount: 0,
        },
      };
    }

    // Get capacity map
    const capacityMap = await this.calendarService.buildCapacityMap({
      organizationId: opts.organizationId,
      workspaceId: opts.workspaceId,
      userIds,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
    });

    // Aggregate demand per user per day
    const demandMap = new Map<string, Map<string, number>>();
    for (const e of demandResult.entries) {
      if (!demandMap.has(e.userId)) {
        demandMap.set(e.userId, new Map());
      }
      const userDemand = demandMap.get(e.userId)!;
      userDemand.set(e.date, (userDemand.get(e.date) || 0) + e.demandHours);
    }

    // Build daily utilization
    const perUserDaily: UserDailyUtilization[] = [];
    let totalCap = 0;
    let totalDem = 0;
    const overallocatedUsers = new Set<string>();

    for (const userId of userIds) {
      const capMap = capacityMap.get(userId);
      if (!capMap) continue;

      const demMap = demandMap.get(userId) || new Map<string, number>();

      for (const [date, capHours] of capMap) {
        const demHours = demMap.get(date) || 0;
        const util = capHours > 0 ? demHours / capHours : demHours > 0 ? Infinity : 0;
        const overBy = Math.max(0, demHours - capHours * threshold);

        totalCap += Number(capHours);
        totalDem += demHours;

        if (overBy > 0) {
          overallocatedUsers.add(userId);
        }

        perUserDaily.push({
          userId,
          date,
          capacityHours: Number(capHours),
          demandHours: Math.round(demHours * 100) / 100,
          utilization: Math.round(util * 1000) / 1000,
          overByHours: Math.round(overBy * 100) / 100,
        });
      }
    }

    // Build weekly rollups
    const perUserWeekly = this.buildWeeklyRollups(perUserDaily, threshold);

    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'CAPACITY_UTILIZATION',
      workspaceId: opts.workspaceId,
      userCount: userIds.length,
      elapsedMs,
    });

    return {
      perUserDaily,
      perUserWeekly,
      workspaceSummary: {
        totalCapacityHours: Math.round(totalCap * 100) / 100,
        totalDemandHours: Math.round(totalDem * 100) / 100,
        averageUtilization:
          totalCap > 0 ? Math.round((totalDem / totalCap) * 1000) / 1000 : 0,
        overallocatedUserCount: overallocatedUsers.size,
      },
    };
  }

  /**
   * Detect overallocations — returns only days where demand exceeds threshold.
   */
  async computeOverallocations(opts: {
    organizationId: string;
    workspaceId: string;
    fromDate: string;
    toDate: string;
    userIds?: string[];
    threshold?: number;
    includeDisabled?: boolean;
  }): Promise<OverallocationResult> {
    const threshold = CapacityAnalyticsService.clampThreshold(opts.threshold);

    // Get demand with full task detail
    const demandResult = await this.demandService.buildDailyDemand({
      organizationId: opts.organizationId,
      workspaceId: opts.workspaceId,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      userIds: opts.userIds,
      includeDisabled: opts.includeDisabled,
    });

    const userIdSet = new Set<string>();
    for (const e of demandResult.entries) {
      userIdSet.add(e.userId);
    }
    const userIds = [...userIdSet];

    if (userIds.length === 0) {
      return { entries: [], totalOverallocatedDays: 0, affectedUserCount: 0 };
    }

    const capacityMap = await this.calendarService.buildCapacityMap({
      organizationId: opts.organizationId,
      workspaceId: opts.workspaceId,
      userIds,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
    });

    // Group demand entries by user+date
    const grouped = new Map<string, DailyDemandEntry[]>();
    for (const e of demandResult.entries) {
      const key = `${e.userId}:${e.date}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    }

    const entries: OverallocationEntry[] = [];
    const affectedUsers = new Set<string>();

    for (const [key, demandEntries] of grouped) {
      const [userId, date] = key.split(':');
      const capMap = capacityMap.get(userId);
      const capHours = capMap ? Number(capMap.get(date) ?? DEFAULT_CAPACITY_HOURS) : DEFAULT_CAPACITY_HOURS;
      const totalDemand = demandEntries.reduce((s, e) => s + e.demandHours, 0);
      const overBy = totalDemand - capHours * threshold;

      if (overBy > 0) {
        affectedUsers.add(userId);
        entries.push({
          userId,
          date,
          capacityHours: capHours,
          demandHours: Math.round(totalDemand * 100) / 100,
          overByHours: Math.round(overBy * 100) / 100,
          tasks: demandEntries.map((e) => ({
            taskId: e.taskId,
            projectId: e.projectId,
            demandHours: e.demandHours,
            source: e.source,
          })),
        });
      }
    }

    // Sort: most over-allocated first
    entries.sort((a, b) => b.overByHours - a.overByHours);

    return {
      entries,
      totalOverallocatedDays: entries.length,
      affectedUserCount: affectedUsers.size,
    };
  }

  /** Group daily entries into weekly rollups (Mon-Sun) */
  private buildWeeklyRollups(
    daily: UserDailyUtilization[],
    threshold: number,
  ): UserWeeklyRollup[] {
    const weekMap = new Map<
      string,
      {
        userId: string;
        weekStart: string;
        totalCap: number;
        totalDem: number;
        peak: number;
        overDays: number;
      }
    >();

    for (const d of daily) {
      const weekStart = this.getWeekStart(d.date);
      const key = `${d.userId}:${weekStart}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          userId: d.userId,
          weekStart,
          totalCap: 0,
          totalDem: 0,
          peak: 0,
          overDays: 0,
        });
      }
      const w = weekMap.get(key)!;
      w.totalCap += d.capacityHours;
      w.totalDem += d.demandHours;
      w.peak = Math.max(w.peak, d.utilization);
      if (d.overByHours > 0) w.overDays++;
    }

    return [...weekMap.values()].map((w) => ({
      userId: w.userId,
      weekStartDate: w.weekStart,
      totalCapacityHours: Math.round(w.totalCap * 100) / 100,
      totalDemandHours: Math.round(w.totalDem * 100) / 100,
      averageUtilization:
        w.totalCap > 0 ? Math.round((w.totalDem / w.totalCap) * 1000) / 1000 : 0,
      peakDayUtilization: Math.round(w.peak * 1000) / 1000,
      overallocatedDays: w.overDays,
    }));
  }

  /** Get Monday of the week for a given date */
  private getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday=0
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  }
}
