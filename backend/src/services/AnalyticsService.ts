import { Analytics } from '@segment/analytics-node';
import { config } from '../config';
import { User, Organization, BRDDocument, Template } from '../models';
import { Op } from 'sequelize';
import { Redis } from 'ioredis';
import { createClient } from 'redis';

interface TrackEventData {
  userId: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  context?: {
    device?: string;
    os?: string;
    browser?: string;
    page?: string;
  };
}

interface FeatureUsageMetrics {
  feature: string;
  totalUsers: number;
  uniqueUsers: number;
  usageCount: number;
  avgTimeSpent: number;
  completionRate: number;
  abandonment: {
    rate: number;
    points: string[];
  };
}

interface WorkflowMetrics {
  workflow: string;
  startedCount: number;
  completedCount: number;
  abandonedCount: number;
  avgCompletionTime: number;
  stepMetrics: Array<{
    step: string;
    completionRate: number;
    avgTime: number;
    dropoffRate: number;
  }>;
}

interface UserSegment {
  id: string;
  name: string;
  criteria: Record<string, any>;
  userCount: number;
}

export class AnalyticsService {
  private analytics: Analytics;
  private redis: ReturnType<typeof createClient>;
  private metricsCache: Map<string, any> = new Map();

  constructor() {
    // Initialize Segment
    this.analytics = new Analytics({
      writeKey: config.analytics?.segmentWriteKey || '',
      flushAt: 20,
      flushInterval: 10000,
    });

    // Initialize Redis for real-time metrics
    this.redis = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    this.redis.connect();
  }

  // Track user events
  async trackEvent(data: TrackEventData) {
    try {
      // Send to Segment
      this.analytics.track({
        userId: data.userId,
        event: data.event,
        properties: {
          ...data.properties,
          timestamp: data.timestamp || new Date(),
        },
        context: data.context,
      });

      // Store in Redis for real-time analytics
      await this.updateRealtimeMetrics(data);

      // Update feature usage metrics
      if (data.properties?.feature) {
        await this.updateFeatureUsage(data.userId, data.properties.feature);
      }
    } catch (error) {
      console.error('Analytics track error:', error);
    }
  }

  // Identify user traits
  async identifyUser(user: User, organization: Organization) {
    try {
      this.analytics.identify({
        userId: user.id,
        traits: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: organization.id,
          organizationName: organization.name,
          industry: organization.industry,
          plan: organization.plan,
          createdAt: user.createdAt,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Analytics identify error:', error);
    }
  }

  // Track page views
  async trackPageView(userId: string, page: string, properties?: Record<string, any>) {
    await this.trackEvent({
      userId,
      event: 'Page Viewed',
      properties: {
        page,
        ...properties,
      },
    });
  }

  // Feature adoption tracking
  async getFeatureAdoptionMetrics(organizationId: string, days: number = 30): Promise<FeatureUsageMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all feature usage events from Redis
    const features = await this.redis.keys(`feature:${organizationId}:*`);
    const metrics: FeatureUsageMetrics[] = [];

    for (const featureKey of features) {
      const feature = featureKey.split(':')[2];
      const usage = await this.redis.hGetAll(featureKey);
      
      const uniqueUsers = new Set(Object.keys(usage));
      const totalUsage = Object.values(usage).reduce((sum, count) => sum + parseInt(count as string), 0);

      // Get completion metrics
      const completionData = await this.getFeatureCompletionRate(organizationId, feature, startDate);

      metrics.push({
        feature,
        totalUsers: await this.getTotalUsers(organizationId),
        uniqueUsers: uniqueUsers.size,
        usageCount: totalUsage,
        avgTimeSpent: await this.getAvgTimeSpent(organizationId, feature),
        completionRate: completionData.rate,
        abandonment: {
          rate: 1 - completionData.rate,
          points: completionData.abandonmentPoints,
        },
      });
    }

    return metrics.sort((a, b) => b.usageCount - a.usageCount);
  }

  // Workflow completion tracking
  async trackWorkflowStart(userId: string, workflow: string, metadata?: any) {
    const workflowId = `${workflow}_${userId}_${Date.now()}`;
    
    await this.redis.hSet(
      `workflow:active:${userId}`,
      workflow,
      JSON.stringify({
        id: workflowId,
        startTime: Date.now(),
        steps: [],
        metadata,
      })
    );

    await this.trackEvent({
      userId,
      event: 'Workflow Started',
      properties: {
        workflow,
        workflowId,
        ...metadata,
      },
    });
  }

  async trackWorkflowStep(userId: string, workflow: string, step: string, success: boolean = true) {
    const workflowData = await this.redis.hGet(`workflow:active:${userId}`, workflow);
    if (!workflowData) return;

    const data = JSON.parse(workflowData);
    data.steps.push({
      step,
      timestamp: Date.now(),
      success,
    });

    await this.redis.hSet(`workflow:active:${userId}`, workflow, JSON.stringify(data));

    await this.trackEvent({
      userId,
      event: 'Workflow Step Completed',
      properties: {
        workflow,
        workflowId: data.id,
        step,
        success,
        stepNumber: data.steps.length,
      },
    });
  }

  async trackWorkflowCompletion(userId: string, workflow: string, success: boolean = true) {
    const workflowData = await this.redis.hGet(`workflow:active:${userId}`, workflow);
    if (!workflowData) return;

    const data = JSON.parse(workflowData);
    const duration = Date.now() - data.startTime;

    // Store completion data
    await this.redis.hSet(
      `workflow:completed:${workflow}`,
      data.id,
      JSON.stringify({
        ...data,
        completedAt: Date.now(),
        duration,
        success,
      })
    );

    // Remove from active workflows
    await this.redis.hDel(`workflow:active:${userId}`, workflow);

    await this.trackEvent({
      userId,
      event: 'Workflow Completed',
      properties: {
        workflow,
        workflowId: data.id,
        success,
        duration,
        steps: data.steps.length,
      },
    });
  }

  async getWorkflowMetrics(organizationId: string, days: number = 30): Promise<WorkflowMetrics[]> {
    const workflows = await this.getUniqueWorkflows(organizationId);
    const metrics: WorkflowMetrics[] = [];

    for (const workflow of workflows) {
      const completedData = await this.redis.hGetAll(`workflow:completed:${workflow}`);
      const activeData = await this.redis.keys(`workflow:active:*`);

      let completedCount = 0;
      let totalDuration = 0;
      const stepMetrics: Record<string, any> = {};

      // Analyze completed workflows
      for (const [id, dataStr] of Object.entries(completedData)) {
        const data = JSON.parse(dataStr);
        if (data.success) {
          completedCount++;
          totalDuration += data.duration;
        }

        // Analyze steps
        data.steps.forEach((step: any, index: number) => {
          if (!stepMetrics[step.step]) {
            stepMetrics[step.step] = {
              completed: 0,
              total: 0,
              duration: 0,
            };
          }
          stepMetrics[step.step].total++;
          if (step.success) {
            stepMetrics[step.step].completed++;
            if (index > 0) {
              stepMetrics[step.step].duration += step.timestamp - data.steps[index - 1].timestamp;
            }
          }
        });
      }

      // Count active (abandoned) workflows
      const abandonedCount = activeData.filter(key => key.includes(workflow)).length;

      metrics.push({
        workflow,
        startedCount: Object.keys(completedData).length + abandonedCount,
        completedCount,
        abandonedCount,
        avgCompletionTime: completedCount > 0 ? totalDuration / completedCount : 0,
        stepMetrics: Object.entries(stepMetrics).map(([step, data]: [string, any]) => ({
          step,
          completionRate: data.total > 0 ? data.completed / data.total : 0,
          avgTime: data.completed > 0 ? data.duration / data.completed : 0,
          dropoffRate: data.total > 0 ? (data.total - data.completed) / data.total : 0,
        })),
      });
    }

    return metrics;
  }

  // Time-to-value metrics
  async getTimeToValueMetrics(organizationId: string) {
    const org = await Organization.findByPk(organizationId);
    if (!org) return null;

    const firstDocument = await BRDDocument.findOne({
      where: { organizationId },
      order: [['createdAt', 'ASC']],
    });

    const firstTemplate = await Template.findOne({
      where: { organizationId },
      order: [['createdAt', 'ASC']],
    });

    const metrics = {
      timeToFirstDocument: firstDocument
        ? firstDocument.createdAt.getTime() - org.createdAt.getTime()
        : null,
      timeToFirstTemplate: firstTemplate
        ? firstTemplate.createdAt.getTime() - org.createdAt.getTime()
        : null,
      documentsCreated: await BRDDocument.count({ where: { organizationId } }),
      templatesCreated: await Template.count({ where: { organizationId } }),
    };

    return metrics;
  }

  // Mobile vs Desktop usage
  async getDeviceUsageMetrics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const deviceData = await this.redis.hGetAll(`devices:${organizationId}`);
    
    const metrics = {
      mobile: 0,
      tablet: 0,
      desktop: 0,
    };

    for (const [device, count] of Object.entries(deviceData)) {
      if (device.includes('mobile')) metrics.mobile += parseInt(count);
      else if (device.includes('tablet')) metrics.tablet += parseInt(count);
      else metrics.desktop += parseInt(count);
    }

    const total = metrics.mobile + metrics.tablet + metrics.desktop;

    return {
      counts: metrics,
      percentages: {
        mobile: total > 0 ? (metrics.mobile / total) * 100 : 0,
        tablet: total > 0 ? (metrics.tablet / total) * 100 : 0,
        desktop: total > 0 ? (metrics.desktop / total) * 100 : 0,
      },
    };
  }

  // Integration effectiveness
  async getIntegrationUsageMetrics(organizationId: string) {
    const integrations = ['slack', 'teams', 'jira', 'github', 'salesforce'];
    const metrics: Record<string, any> = {};

    for (const integration of integrations) {
      const usage = await this.redis.hGet(`integration:usage:${organizationId}`, integration);
      const errors = await this.redis.hGet(`integration:errors:${organizationId}`, integration);

      metrics[integration] = {
        usage: parseInt(usage || '0'),
        errors: parseInt(errors || '0'),
        successRate: usage && errors ? (parseInt(usage) - parseInt(errors)) / parseInt(usage) : 1,
      };
    }

    return metrics;
  }

  // User segments
  async getUserSegments(organizationId: string): Promise<UserSegment[]> {
    const users = await User.findAll({
      where: { organizationId },
      include: [Organization],
    });

    const segments: UserSegment[] = [
      {
        id: 'power_users',
        name: 'Power Users',
        criteria: { documentsCreated: { $gte: 10 } },
        userCount: 0,
      },
      {
        id: 'new_users',
        name: 'New Users',
        criteria: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        userCount: 0,
      },
      {
        id: 'inactive_users',
        name: 'Inactive Users',
        criteria: { lastActive: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        userCount: 0,
      },
    ];

    // Count users in each segment
    for (const user of users) {
      const userMetrics = await this.getUserMetrics(user.id);
      
      if (userMetrics.documentsCreated >= 10) {
        segments[0].userCount++;
      }
      if (user.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        segments[1].userCount++;
      }
      if (user.lastActive < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        segments[2].userCount++;
      }
    }

    return segments;
  }

  // Helper methods
  private async updateRealtimeMetrics(data: TrackEventData) {
    const hour = new Date().getHours();
    const key = `metrics:${data.event}:${new Date().toISOString().split('T')[0]}`;
    
    await this.redis.hIncrBy(key, `hour_${hour}`, 1);
    await this.redis.expire(key, 86400 * 7); // Keep for 7 days
  }

  private async updateFeatureUsage(userId: string, feature: string) {
    const org = await User.findByPk(userId, {
      attributes: ['organizationId'],
    });
    
    if (org) {
      await this.redis.hIncrBy(`feature:${org.organizationId}:${feature}`, userId, 1);
    }
  }

  private async getTotalUsers(organizationId: string): Promise<number> {
    return User.count({ where: { organizationId } });
  }

  private async getAvgTimeSpent(organizationId: string, feature: string): Promise<number> {
    // This would be calculated from session data
    return 0; // Placeholder
  }

  private async getFeatureCompletionRate(organizationId: string, feature: string, startDate: Date) {
    // This would analyze workflow data for the feature
    return {
      rate: 0.75, // Placeholder
      abandonmentPoints: ['step_2', 'step_4'],
    };
  }

  private async getUniqueWorkflows(organizationId: string): Promise<string[]> {
    // Get unique workflow names from completed workflows
    const keys = await this.redis.keys('workflow:completed:*');
    return [...new Set(keys.map(key => key.split(':')[2]))];
  }

  private async getUserMetrics(userId: string) {
    const documentsCreated = await BRDDocument.count({
      where: { createdBy: userId },
    });

    return {
      documentsCreated,
    };
  }

  // Export analytics data
  async exportAnalyticsData(organizationId: string, startDate: Date, endDate: Date) {
    const [
      featureMetrics,
      workflowMetrics,
      deviceMetrics,
      integrationMetrics,
      userSegments,
    ] = await Promise.all([
      this.getFeatureAdoptionMetrics(organizationId),
      this.getWorkflowMetrics(organizationId),
      this.getDeviceUsageMetrics(organizationId),
      this.getIntegrationUsageMetrics(organizationId),
      this.getUserSegments(organizationId),
    ]);

    return {
      period: { startDate, endDate },
      featureMetrics,
      workflowMetrics,
      deviceMetrics,
      integrationMetrics,
      userSegments,
      exportedAt: new Date(),
    };
  }
}

export const analyticsService = new AnalyticsService();