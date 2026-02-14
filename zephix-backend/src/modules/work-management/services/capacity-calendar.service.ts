import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WorkspaceMemberCapacity } from '../entities/workspace-member-capacity.entity';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';

/** Default capacity hours per day when no override exists */
export const DEFAULT_CAPACITY_HOURS = 8;

@Injectable()
export class CapacityCalendarService {
  private readonly logger = new Logger(CapacityCalendarService.name);

  constructor(
    @InjectRepository(WorkspaceMemberCapacity)
    private readonly capacityRepo: Repository<WorkspaceMemberCapacity>,
  ) {}

  /**
   * Get daily capacity for users in a date range.
   * Returns existing overrides; callers should fill defaults for missing days.
   */
  async getDailyCapacity(opts: {
    organizationId: string;
    workspaceId: string;
    userIds: string[];
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
  }): Promise<WorkspaceMemberCapacity[]> {
    if (opts.userIds.length === 0) return [];

    return this.capacityRepo
      .createQueryBuilder('c')
      .where('c.organization_id = :orgId', { orgId: opts.organizationId })
      .andWhere('c.workspace_id = :wsId', { wsId: opts.workspaceId })
      .andWhere('c.user_id IN (:...userIds)', { userIds: opts.userIds })
      .andWhere('c.date >= :from', { from: opts.fromDate })
      .andWhere('c.date <= :to', { to: opts.toDate })
      .orderBy('c.date', 'ASC')
      .addOrderBy('c.user_id', 'ASC')
      .getMany();
  }

  /**
   * Set (upsert) daily capacity for a user on a specific date.
   * Only ADMIN / workspace_owner can call this (enforced by controller).
   */
  async setDailyCapacity(opts: {
    organizationId: string;
    workspaceId: string;
    userId: string;
    date: string; // YYYY-MM-DD
    capacityHours: number;
  }): Promise<WorkspaceMemberCapacity> {
    const { organizationId, workspaceId, userId, date, capacityHours } = opts;

    // Upsert: try to find existing record, update or insert
    let existing = await this.capacityRepo.findOne({
      where: { organizationId, workspaceId, userId, date },
    });

    if (existing) {
      existing.capacityHours = capacityHours;
      return this.capacityRepo.save(existing);
    }

    const record = this.capacityRepo.create({
      organizationId,
      workspaceId,
      userId,
      date,
      capacityHours,
    });
    return this.capacityRepo.save(record);
  }

  /**
   * Build a capacity map for given users/date range.
   * Returns Map<userId, Map<date, hours>>.
   * Missing dates default to DEFAULT_CAPACITY_HOURS.
   */
  async buildCapacityMap(opts: {
    organizationId: string;
    workspaceId: string;
    userIds: string[];
    fromDate: string;
    toDate: string;
  }): Promise<Map<string, Map<string, number>>> {
    const overrides = await this.getDailyCapacity(opts);

    const map = new Map<string, Map<string, number>>();

    // Seed defaults for all users/dates
    for (const userId of opts.userIds) {
      const userMap = new Map<string, number>();
      const dates = this.enumerateDates(opts.fromDate, opts.toDate);
      for (const d of dates) {
        // Weekend detection: Sat=6, Sun=0
        const dayOfWeek = new Date(d + 'T00:00:00Z').getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        userMap.set(d, isWeekend ? 0 : DEFAULT_CAPACITY_HOURS);
      }
      map.set(userId, userMap);
    }

    // Apply overrides
    for (const ov of overrides) {
      const userMap = map.get(ov.userId);
      if (userMap) {
        userMap.set(ov.date, Number(ov.capacityHours));
      }
    }

    return map;
  }

  /** Enumerate dates between from and to (inclusive), returns YYYY-MM-DD strings */
  enumerateDates(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(from + 'T00:00:00Z');
    const end = new Date(to + 'T00:00:00Z');
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }
}
