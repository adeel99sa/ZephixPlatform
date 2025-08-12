import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPresence, PresenceStatus } from './entities/user-presence.entity';

@Injectable()
export class UserPresenceService {
  private readonly logger = new Logger(UserPresenceService.name);

  constructor(
    @InjectRepository(UserPresence)
    private userPresenceRepository: Repository<UserPresence>,
  ) {}

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    try {
      let presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (!presence) {
        presence = this.userPresenceRepository.create({
          userId,
          status: PresenceStatus.ONLINE,
          socketId,
          lastSeen: new Date(),
        });
      } else {
        presence.status = PresenceStatus.ONLINE;
        presence.socketId = socketId;
        presence.lastSeen = new Date();
      }

      await this.userPresenceRepository.save(presence);
      this.logger.log(`User ${userId} is now online`);
    } catch (error) {
      this.logger.error(`Error setting user online: ${error.message}`);
      throw error;
    }
  }

  async setUserOffline(userId: string): Promise<void> {
    try {
      const presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (presence) {
        presence.status = PresenceStatus.OFFLINE;
        presence.socketId = null;
        presence.lastSeen = new Date();
        await this.userPresenceRepository.save(presence);
        this.logger.log(`User ${userId} is now offline`);
      }
    } catch (error) {
      this.logger.error(`Error setting user offline: ${error.message}`);
      throw error;
    }
  }

  async setUserAway(userId: string): Promise<void> {
    try {
      const presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (presence) {
        presence.status = PresenceStatus.AWAY;
        presence.lastSeen = new Date();
        await this.userPresenceRepository.save(presence);
        this.logger.log(`User ${userId} is now away`);
      }
    } catch (error) {
      this.logger.error(`Error setting user away: ${error.message}`);
      throw error;
    }
  }

  async setUserBusy(userId: string): Promise<void> {
    try {
      const presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (presence) {
        presence.status = PresenceStatus.BUSY;
        presence.lastSeen = new Date();
        await this.userPresenceRepository.save(presence);
        this.logger.log(`User ${userId} is now busy`);
      }
    } catch (error) {
      this.logger.error(`Error setting user busy: ${error.message}`);
      throw error;
    }
  }

  async updateCurrentProject(userId: string, projectId: string | null): Promise<void> {
    try {
      const presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (presence) {
        presence.currentProjectId = projectId;
        presence.lastSeen = new Date();
        await this.userPresenceRepository.save(presence);
      }
    } catch (error) {
      this.logger.error(`Error updating current project: ${error.message}`);
      throw error;
    }
  }

  async updateCurrentTask(userId: string, taskId: string | null): Promise<void> {
    try {
      const presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (presence) {
        presence.currentTaskId = taskId;
        presence.lastSeen = new Date();
        await this.userPresenceRepository.save(presence);
      }
    } catch (error) {
      this.logger.error(`Error updating current task: ${error.message}`);
      throw error;
    }
  }

  async setTypingStatus(userId: string, isTyping: boolean, typingIn?: string): Promise<void> {
    try {
      const presence = await this.userPresenceRepository.findOne({
        where: { userId },
      });

      if (presence) {
        presence.isTyping = isTyping;
        presence.typingIn = typingIn || null;
        await this.userPresenceRepository.save(presence);
      }
    } catch (error) {
      this.logger.error(`Error setting typing status: ${error.message}`);
      throw error;
    }
  }

  async getOnlineUsers(organizationId: string): Promise<UserPresence[]> {
    try {
      return await this.userPresenceRepository
        .createQueryBuilder('presence')
        .leftJoinAndSelect('presence.user', 'user')
        .where('user.organizationId = :organizationId', { organizationId })
        .andWhere('presence.status = :status', { status: PresenceStatus.ONLINE })
        .orderBy('presence.lastSeen', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Error getting online users: ${error.message}`);
      throw error;
    }
  }

  async getProjectMembers(projectId: string): Promise<UserPresence[]> {
    try {
      return await this.userPresenceRepository
        .createQueryBuilder('presence')
        .leftJoinAndSelect('presence.user', 'user')
        .where('presence.currentProjectId = :projectId', { projectId })
        .andWhere('presence.status IN (:...statuses)', {
          statuses: [PresenceStatus.ONLINE, PresenceStatus.AWAY, PresenceStatus.BUSY],
        })
        .orderBy('presence.lastSeen', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Error getting project members: ${error.message}`);
      throw error;
    }
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      return await this.userPresenceRepository.findOne({
        where: { userId },
        relations: ['user'],
      });
    } catch (error) {
      this.logger.error(`Error getting user presence: ${error.message}`);
      throw error;
    }
  }

  async cleanupInactiveUsers(): Promise<void> {
    try {
      const inactiveThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      await this.userPresenceRepository
        .createQueryBuilder()
        .update(UserPresence)
        .set({ 
          status: PresenceStatus.OFFLINE,
          socketId: null,
          lastSeen: new Date(),
        })
        .where('lastSeen < :threshold', { threshold: inactiveThreshold })
        .andWhere('status != :status', { status: PresenceStatus.OFFLINE })
        .execute();
    } catch (error) {
      this.logger.error(`Error cleaning up inactive users: ${error.message}`);
      throw error;
    }
  }
}
