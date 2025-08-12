import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { UserPresenceService } from './user-presence.service';
import { CommentService } from './comment.service';
import { ActivityFeedService } from './activity-feed.service';

export interface ProjectMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastSeen: Date;
  currentProjectId?: string;
  currentTaskId?: string;
  isTyping: boolean;
}

export interface CollaborationStats {
  totalMembers: number;
  onlineMembers: number;
  totalComments: number;
  recentActivity: Date;
  activeUsers: number;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userPresenceService: UserPresenceService,
    private commentService: CommentService,
    private activityFeedService: ActivityFeedService,
  ) {}

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    try {
      // Get project with members
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['members', 'members.user'],
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get presence data for all members
      const membersWithPresence: ProjectMember[] = [];

      for (const member of project.members) {
        const presence = await this.userPresenceService.getUserPresence(member.userId);
        
        membersWithPresence.push({
          id: member.userId,
          email: member.user.email,
          name: member.user.name,
          role: member.role,
          status: presence?.status || 'offline',
          lastSeen: presence?.lastSeen || new Date(),
          currentProjectId: presence?.currentProjectId,
          currentTaskId: presence?.currentTaskId,
          isTyping: presence?.isTyping || false,
        });
      }

      // Sort by online status, then by last seen
      return membersWithPresence.sort((a, b) => {
        const aOnline = a.status === 'online';
        const bOnline = b.status === 'online';
        
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });
    } catch (error) {
      this.logger.error(`Error getting project members: ${error.message}`);
      throw error;
    }
  }

  async getOnlineMembers(projectId: string): Promise<ProjectMember[]> {
    try {
      const allMembers = await this.getProjectMembers(projectId);
      return allMembers.filter(member => member.status === 'online');
    } catch (error) {
      this.logger.error(`Error getting online members: ${error.message}`);
      throw error;
    }
  }

  async getCollaborationStats(projectId: string): Promise<CollaborationStats> {
    try {
      const [members, commentStats, activityStats] = await Promise.all([
        this.getProjectMembers(projectId),
        this.commentService.getCommentStats(projectId),
        this.activityFeedService.getActivityStats(projectId),
      ]);

      const onlineMembers = members.filter(member => member.status === 'online').length;
      const activeUsers = members.filter(member => 
        member.status === 'online' || 
        member.status === 'away' || 
        member.status === 'busy'
      ).length;

      return {
        totalMembers: members.length,
        onlineMembers,
        totalComments: commentStats.totalComments,
        recentActivity: activityStats.recentActivity,
        activeUsers,
      };
    } catch (error) {
      this.logger.error(`Error getting collaboration stats: ${error.message}`);
      throw error;
    }
  }

  async joinProject(userId: string, projectId: string): Promise<void> {
    try {
      // Update user presence to show they're in this project
      await this.userPresenceService.updateCurrentProject(userId, projectId);
      
      // Log activity
      await this.activityFeedService.logActivity({
        projectId,
        userId,
        type: 'user_joined',
        description: 'Joined the project',
      });

      this.logger.log(`User ${userId} joined project ${projectId}`);
    } catch (error) {
      this.logger.error(`Error joining project: ${error.message}`);
      throw error;
    }
  }

  async leaveProject(userId: string, projectId: string): Promise<void> {
    try {
      // Update user presence to show they're not in this project
      await this.userPresenceService.updateCurrentProject(userId, null);
      
      // Log activity
      await this.activityFeedService.logActivity({
        projectId,
        userId,
        type: 'user_left',
        description: 'Left the project',
      });

      this.logger.log(`User ${userId} left project ${projectId}`);
    } catch (error) {
      this.logger.error(`Error leaving project: ${error.message}`);
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    try {
      switch (status) {
        case 'online':
          await this.userPresenceService.setUserOnline(userId, 'manual');
          break;
        case 'away':
          await this.userPresenceService.setUserAway(userId);
          break;
        case 'busy':
          await this.userPresenceService.setUserBusy(userId);
          break;
        case 'offline':
          await this.userPresenceService.setUserOffline(userId);
          break;
      }

      this.logger.log(`User ${userId} status updated to ${status}`);
    } catch (error) {
      this.logger.error(`Error updating user status: ${error.message}`);
      throw error;
    }
  }

  async getProjectActivityFeed(
    projectId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      return await this.activityFeedService.getProjectActivity(projectId, page, limit);
    } catch (error) {
      this.logger.error(`Error getting project activity feed: ${error.message}`);
      throw error;
    }
  }

  async markActivityAsRead(activityId: string, userId: string): Promise<void> {
    try {
      await this.activityFeedService.markActivityAsRead(activityId, userId);
    } catch (error) {
      this.logger.error(`Error marking activity as read: ${error.message}`);
      throw error;
    }
  }

  async getUnreadActivityCount(projectId: string, userId: string): Promise<number> {
    try {
      return await this.activityFeedService.getUnreadActivityCount(projectId, userId);
    } catch (error) {
      this.logger.error(`Error getting unread activity count: ${error.message}`);
      throw error;
    }
  }

  async searchProjectContent(
    projectId: string,
    query: string,
    types: ('comments' | 'tasks' | 'requirements')[] = ['comments'],
  ): Promise<any[]> {
    try {
      const results: any[] = [];

      if (types.includes('comments')) {
        const comments = await this.commentService.searchComments(projectId, query);
        results.push(...comments.map(comment => ({
          type: 'comment',
          id: comment.id,
          content: comment.content,
          user: comment.user,
          createdAt: comment.createdAt,
          relevance: this.calculateRelevance(comment.content, query),
        })));
      }

      // Sort by relevance
      return results.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      this.logger.error(`Error searching project content: ${error.message}`);
      throw error;
    }
  }

  private calculateRelevance(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (contentLower.includes(queryLower)) {
      return 100;
    }
    
    const words = queryLower.split(' ');
    let relevance = 0;
    
    words.forEach(word => {
      if (contentLower.includes(word)) {
        relevance += 20;
      }
    });
    
    return relevance;
  }

  async getProjectCollaborationInsights(projectId: string): Promise<{
    mostActiveUsers: Array<{ userId: string; name: string; activityCount: number }>;
    peakActivityHours: Array<{ hour: number; activityCount: number }>;
    collaborationTrends: Array<{ date: string; activityCount: number }>;
  }> {
    try {
      // This would implement analytics for collaboration insights
      // For now, return placeholder data
      return {
        mostActiveUsers: [],
        peakActivityHours: [],
        collaborationTrends: [],
      };
    } catch (error) {
      this.logger.error(`Error getting collaboration insights: ${error.message}`);
      throw error;
    }
  }
}
