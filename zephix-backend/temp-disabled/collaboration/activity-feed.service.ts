import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityType } from './entities/activity-log.entity';

export interface LogActivityDto {
  projectId: string;
  userId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityFeedService {
  private readonly logger = new Logger(ActivityFeedService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async logActivity(logActivityDto: LogActivityDto): Promise<ActivityLog> {
    try {
      const activityLog = this.activityLogRepository.create({
        ...logActivityDto,
        metadata: logActivityDto.metadata || {},
      });

      const savedLog = await this.activityLogRepository.save(activityLog);
      
      this.logger.log(`Activity logged: ${logActivityDto.type} for project ${logActivityDto.projectId}`);
      return savedLog;
    } catch (error) {
      this.logger.error(`Error logging activity: ${error.message}`);
      throw error;
    }
  }

  async getProjectActivity(
    projectId: string,
    page: number = 1,
    limit: number = 50,
    types?: ActivityType[],
  ): Promise<{
    activities: ActivityLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const queryBuilder = this.activityLogRepository
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.user', 'user')
        .where('activity.projectId = :projectId', { projectId })
        .orderBy('activity.createdAt', 'DESC');

      if (types && types.length > 0) {
        queryBuilder.andWhere('activity.type IN (:...types)', { types });
      }

      const [activities, total] = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        activities,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Error getting project activity: ${error.message}`);
      throw error;
    }
  }

  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    activities: ActivityLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const [activities, total] = await this.activityLogRepository.findAndCount({
        where: { userId },
        relations: ['project'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        activities,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Error getting user activity: ${error.message}`);
      throw error;
    }
  }

  async getRecentActivity(projectId: string, limit: number = 10): Promise<ActivityLog[]> {
    try {
      return await this.activityLogRepository.find({
        where: { projectId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting recent activity: ${error.message}`);
      throw error;
    }
  }

  async getActivityByType(
    projectId: string,
    type: ActivityType,
    limit: number = 20,
  ): Promise<ActivityLog[]> {
    try {
      return await this.activityLogRepository.find({
        where: { projectId, type },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting activity by type: ${error.message}`);
      throw error;
    }
  }

  async markActivityAsRead(activityId: string, userId: string): Promise<void> {
    try {
      await this.activityLogRepository.update(
        { id: activityId },
        { isRead: true },
      );
    } catch (error) {
      this.logger.error(`Error marking activity as read: ${error.message}`);
      throw error;
    }
  }

  async markAllProjectActivityAsRead(projectId: string, userId: string): Promise<void> {
    try {
      await this.activityLogRepository.update(
        { projectId, userId, isRead: false },
        { isRead: true },
      );
    } catch (error) {
      this.logger.error(`Error marking all project activity as read: ${error.message}`);
      throw error;
    }
  }

  async getUnreadActivityCount(projectId: string, userId: string): Promise<number> {
    try {
      return await this.activityLogRepository.count({
        where: { projectId, userId, isRead: false },
      });
    } catch (error) {
      this.logger.error(`Error getting unread activity count: ${error.message}`);
      throw error;
    }
  }

  async getActivityStats(projectId: string): Promise<{
    totalActivities: number;
    activitiesByType: Record<ActivityType, number>;
    recentActivity: Date;
  }> {
    try {
      const [totalActivities, activitiesByType, recentActivity] = await Promise.all([
        this.activityLogRepository.count({ where: { projectId } }),
        this.getActivitiesByTypeCount(projectId),
        this.getMostRecentActivity(projectId),
      ]);

      return {
        totalActivities,
        activitiesByType,
        recentActivity: recentActivity?.createdAt || new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting activity stats: ${error.message}`);
      throw error;
    }
  }

  private async getActivitiesByTypeCount(projectId: string): Promise<Record<ActivityType, number>> {
    try {
      const result = await this.activityLogRepository
        .createQueryBuilder('activity')
        .select('activity.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('activity.projectId = :projectId', { projectId })
        .groupBy('activity.type')
        .getRawMany();

      const activitiesByType: Record<ActivityType, number> = {} as Record<ActivityType, number>;
      
      // Initialize all types with 0
      Object.values(ActivityType).forEach(type => {
        activitiesByType[type] = 0;
      });

      // Set actual counts
      result.forEach(item => {
        activitiesByType[item.type] = parseInt(item.count);
      });

      return activitiesByType;
    } catch (error) {
      this.logger.error(`Error getting activities by type count: ${error.message}`);
      throw error;
    }
  }

  private async getMostRecentActivity(projectId: string): Promise<ActivityLog | null> {
    try {
      return await this.activityLogRepository.findOne({
        where: { projectId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error getting most recent activity: ${error.message}`);
      throw error;
    }
  }

  async cleanupOldActivity(projectId: string, daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await this.activityLogRepository
        .createQueryBuilder()
        .delete()
        .from(ActivityLog)
        .where('projectId = :projectId', { projectId })
        .andWhere('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleaned up old activity for project ${projectId} older than ${daysToKeep} days`);
    } catch (error) {
      this.logger.error(`Error cleaning up old activity: ${error.message}`);
      throw error;
    }
  }
}
