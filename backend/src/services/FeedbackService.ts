import { Feedback, FeedbackType, FeedbackPriority, FeedbackStatus } from '../models/Feedback';
import { User } from '../models';
import { uploadService } from './UploadService';
import { emailService } from './EmailService';
import { slackService } from './SlackService';
import { Op } from 'sequelize';

interface CreateFeedbackDto {
  type: FeedbackType;
  priority?: FeedbackPriority;
  title: string;
  description: string;
  screenshot?: string; // Base64 encoded image
  rating?: number;
  metadata?: {
    page?: string;
    feature?: string;
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
    sessionId?: string;
    errorStack?: string;
    userJourney?: Array<{
      page: string;
      action: string;
      timestamp: Date;
    }>;
    systemInfo?: {
      browser: string;
      os: string;
      device: string;
    };
  };
}

interface FeedbackFilters {
  type?: FeedbackType;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  userId?: string;
  organizationId?: string;
  feature?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class FeedbackService {
  async createFeedback(
    userId: string,
    organizationId: string,
    data: CreateFeedbackDto
  ): Promise<Feedback> {
    let screenshotUrl: string | undefined;

    // Upload screenshot if provided
    if (data.screenshot) {
      try {
        screenshotUrl = await uploadService.uploadBase64Image(
          data.screenshot,
          `feedback/${organizationId}/${Date.now()}.png`
        );
      } catch (error) {
        console.error('Failed to upload screenshot:', error);
      }
    }

    // Create feedback record
    const feedback = await Feedback.create({
      ...data,
      userId,
      organizationId,
      screenshotUrl,
      priority: data.priority || this.determinePriority(data.type, data.description),
    });

    // Notify development team for critical issues
    if (feedback.priority === FeedbackPriority.CRITICAL || feedback.type === FeedbackType.BUG) {
      await this.notifyDevelopmentTeam(feedback);
    }

    return feedback;
  }

  async getFeedback(
    organizationId: string,
    filters: FeedbackFilters,
    page: number = 1,
    limit: number = 20
  ) {
    const where: any = { organizationId };

    if (filters.type) where.type = filters.type;
    if (filters.priority) where.priority = filters.priority;
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.feature) {
      where['metadata.feature'] = filters.feature;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt[Op.gte] = filters.dateFrom;
      if (filters.dateTo) where.createdAt[Op.lte] = filters.dateTo;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Feedback.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
    });

    return {
      feedbacks: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    resolution?: string,
    assignedTo?: string
  ): Promise<Feedback> {
    const feedback = await Feedback.findByPk(feedbackId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    feedback.status = status;
    if (resolution) feedback.resolution = resolution;
    if (assignedTo) feedback.assignedTo = assignedTo;
    if (status === FeedbackStatus.RESOLVED) {
      feedback.resolvedAt = new Date();
    }

    await feedback.save();

    // Notify user if resolved
    if (status === FeedbackStatus.RESOLVED) {
      await this.notifyUserResolution(feedback);
    }

    return feedback;
  }

  async getFeatureRatings(organizationId: string) {
    const ratings = await Feedback.findAll({
      where: {
        organizationId,
        rating: { [Op.not]: null },
      },
      attributes: [
        ['metadata.feature', 'feature'],
        [Feedback.sequelize!.fn('AVG', Feedback.sequelize!.col('rating')), 'avgRating'],
        [Feedback.sequelize!.fn('COUNT', Feedback.sequelize!.col('rating')), 'count'],
      ],
      group: ['metadata.feature'],
      raw: true,
    });

    return ratings;
  }

  async getUserJourneyInsights(organizationId: string) {
    const feedbacksWithJourneys = await Feedback.findAll({
      where: {
        organizationId,
        'metadata.userJourney': { [Op.not]: null },
      },
      attributes: ['id', 'type', 'metadata'],
    });

    // Analyze common failure points
    const journeyAnalysis = this.analyzeUserJourneys(feedbacksWithJourneys);

    return journeyAnalysis;
  }

  async getFeedbackTrends(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await Feedback.findAll({
      where: {
        organizationId,
        createdAt: { [Op.gte]: startDate },
      },
      attributes: [
        [Feedback.sequelize!.fn('DATE', Feedback.sequelize!.col('createdAt')), 'date'],
        'type',
        [Feedback.sequelize!.fn('COUNT', Feedback.sequelize!.col('id')), 'count'],
      ],
      group: ['date', 'type'],
      order: [['date', 'ASC']],
      raw: true,
    });

    return trends;
  }

  private determinePriority(type: FeedbackType, description: string): FeedbackPriority {
    // Auto-determine priority based on type and keywords
    const criticalKeywords = ['crash', 'data loss', 'security', 'cannot access', 'broken'];
    const highKeywords = ['error', 'bug', 'failed', 'not working'];
    
    const lowerDescription = description.toLowerCase();
    
    if (type === FeedbackType.BUG) {
      if (criticalKeywords.some(keyword => lowerDescription.includes(keyword))) {
        return FeedbackPriority.CRITICAL;
      }
      if (highKeywords.some(keyword => lowerDescription.includes(keyword))) {
        return FeedbackPriority.HIGH;
      }
      return FeedbackPriority.MEDIUM;
    }
    
    return FeedbackPriority.MEDIUM;
  }

  private async notifyDevelopmentTeam(feedback: Feedback) {
    const user = await feedback.$get('user');
    
    // Send Slack notification
    try {
      await slackService.sendAlert({
        channel: '#dev-alerts',
        title: `🚨 ${feedback.priority.toUpperCase()} ${feedback.type}: ${feedback.title}`,
        description: feedback.description,
        fields: [
          { title: 'User', value: `${user?.firstName} ${user?.lastName} (${user?.email})` },
          { title: 'Organization', value: feedback.organizationId },
          { title: 'Page', value: feedback.metadata?.page || 'Unknown' },
          { title: 'Priority', value: feedback.priority },
        ],
        color: feedback.priority === FeedbackPriority.CRITICAL ? 'danger' : 'warning',
        link: `${process.env.ADMIN_URL}/feedback/${feedback.id}`,
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }

    // Send email to dev team
    try {
      await emailService.sendFeedbackAlert(feedback);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  private async notifyUserResolution(feedback: Feedback) {
    const user = await feedback.$get('user');
    if (!user) return;

    try {
      await emailService.sendFeedbackResolution(user.email, feedback);
    } catch (error) {
      console.error('Failed to notify user of resolution:', error);
    }
  }

  private analyzeUserJourneys(feedbacks: Feedback[]) {
    const problemPages: Record<string, number> = {};
    const commonPaths: Record<string, number> = {};
    const dropoffPoints: Record<string, number> = {};

    feedbacks.forEach(feedback => {
      const journey = feedback.metadata?.userJourney;
      if (!journey || journey.length === 0) return;

      // Count problem pages (last page in journey before feedback)
      const lastPage = journey[journey.length - 1]?.page;
      if (lastPage) {
        problemPages[lastPage] = (problemPages[lastPage] || 0) + 1;
      }

      // Analyze common paths
      const pathKey = journey.map(j => j.page).join(' -> ');
      commonPaths[pathKey] = (commonPaths[pathKey] || 0) + 1;

      // Identify dropoff points for bug reports
      if (feedback.type === FeedbackType.BUG && journey.length > 1) {
        const secondLastPage = journey[journey.length - 2]?.page;
        if (secondLastPage) {
          dropoffPoints[secondLastPage] = (dropoffPoints[secondLastPage] || 0) + 1;
        }
      }
    });

    return {
      problemPages: Object.entries(problemPages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      commonPaths: Object.entries(commonPaths)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      dropoffPoints: Object.entries(dropoffPoints)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  }
}

export const feedbackService = new FeedbackService();