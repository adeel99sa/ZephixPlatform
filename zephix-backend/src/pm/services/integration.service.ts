import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(WorkflowTemplate)
    private templateRepository: Repository<WorkflowTemplate>,
  ) {}

  async triggerWebhook(organizationId: string, event: string, payload: any): Promise<void> {
    const integrations = await this.getActiveIntegrations(organizationId, event);
    
    for (const integration of integrations) {
      try {
        await this.executeWebhook(integration, payload);
        this.logger.log(`Successfully triggered webhook for event ${event}`);
      } catch (error) {
        this.logger.error(`Webhook failed for ${integration.endpoint}`, error);
      }
    }
  }

  async sendSlackNotification(webhookUrl: string, payload: any): Promise<void> {
    const slackPayload = {
      text: `New submission: ${payload.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📋 New ${payload.formName} Submission`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Title:*\n${payload.title}`,
            },
            {
              type: 'mrkdwn',
              text: `*Submitter:*\n${payload.submitter}`,
            },
            {
              type: 'mrkdwn',
              text: `*Priority:*\n${payload.priority.toUpperCase()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Submitted:*\n${new Date(payload.createdAt).toLocaleString()}`,
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Submission',
              },
              url: `${process.env.FRONTEND_URL}/intake/submissions/${payload.submissionId}`,
              style: 'primary',
            },
          ],
        },
      ],
    };

    await this.sendWebhookRequest(webhookUrl, slackPayload);
  }

  async sendTeamsNotification(webhookUrl: string, payload: any): Promise<void> {
    const teamsPayload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '0076D7',
      summary: `New submission: ${payload.title}`,
      sections: [
        {
          activityTitle: `📋 New ${payload.formName} Submission`,
          activitySubtitle: `Submitted by ${payload.submitter}`,
          facts: [
            {
              name: 'Title',
              value: payload.title,
            },
            {
              name: 'Priority',
              value: payload.priority.toUpperCase(),
            },
            {
              name: 'Submitted',
              value: new Date(payload.createdAt).toLocaleString(),
            },
          ],
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Submission',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL}/intake/submissions/${payload.submissionId}`,
            },
          ],
        },
      ],
    };

    await this.sendWebhookRequest(webhookUrl, teamsPayload);
  }

  async sendCustomWebhook(
    url: string, 
    payload: any, 
    headers?: Record<string, string>
  ): Promise<void> {
    const customHeaders = {
      'Content-Type': 'application/json',
      'X-Zephix-Event': 'intake.submitted',
      'X-Zephix-Timestamp': new Date().toISOString(),
      ...headers,
    };

    await this.sendWebhookRequest(url, payload, customHeaders);
  }

  async sendEmailNotification(
    recipients: string[], 
    subject: string, 
    payload: any
  ): Promise<void> {
    // This would integrate with your email service (SendGrid, SES, etc.)
    this.logger.log(`Email notification would be sent to: ${recipients.join(', ')}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
  }

  async executeAutomation(
    organizationId: string,
    automation: any,
    context: any
  ): Promise<void> {
    const { trigger, action, conditions } = automation;

    // Check if conditions are met
    if (!this.evaluateConditions(conditions, context)) {
      return;
    }

    try {
      switch (action) {
        case 'send_notification':
          await this.handleNotificationAction(automation, context);
          break;
        
        case 'webhook':
          await this.handleWebhookAction(automation, context);
          break;
        
        case 'move_to_stage':
          await this.handleStageTransitionAction(automation, context);
          break;
        
        case 'assign_user':
          await this.handleAssignmentAction(automation, context);
          break;
        
        default:
          this.logger.warn(`Unknown automation action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Automation execution failed for action ${action}`, error);
      throw error;
    }
  }

  // Private helper methods
  private async getActiveIntegrations(organizationId: string, event: string): Promise<any[]> {
    const templates = await this.templateRepository.find({
      where: { organizationId, isActive: true },
    });

    const integrations: any[] = [];

    templates.forEach(template => {
      if (template.configuration.integrations) {
        template.configuration.integrations.forEach(integration => {
          if (integration.events.includes(event)) {
            integrations.push(integration);
          }
        });
      }
    });

    return integrations;
  }

  private async executeWebhook(integration: any, payload: any): Promise<void> {
    const transformedPayload = this.transformPayload(payload, integration.payload_template);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Zephix-Event': integration.events[0], // First event in the list
      'X-Zephix-Timestamp': new Date().toISOString(),
      ...integration.headers,
    };

    await this.sendWebhookRequest(integration.endpoint, transformedPayload, headers);
  }

  private transformPayload(payload: any, template: Record<string, any>): any {
    if (!template || Object.keys(template).length === 0) {
      return payload;
    }

    const transformedPayload = {};

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Template variable like {{title}} or {{data.formData.email}}
        const path = value.slice(2, -2).trim();
        transformedPayload[key] = this.getNestedValue(payload, path);
      } else if (typeof value === 'object') {
        transformedPayload[key] = this.transformPayload(payload, value);
      } else {
        transformedPayload[key] = value;
      }
    }

    return transformedPayload;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async sendWebhookRequest(
    url: string, 
    payload: any, 
    headers: Record<string, string> = {}
  ): Promise<void> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Zephix-Webhook/1.0',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultHeaders, ...headers },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
    }

    this.logger.log(`Webhook successfully sent to ${url}`);
  }

  private evaluateConditions(conditions: Record<string, any>, context: any): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // No conditions means always execute
    }

    for (const [field, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getNestedValue(context, field);
      
      if (typeof expectedValue === 'object' && expectedValue.operator) {
        // Complex condition with operator
        if (!this.evaluateOperatorCondition(actualValue, expectedValue)) {
          return false;
        }
      } else {
        // Simple equality check
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateOperatorCondition(actualValue: any, condition: any): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return actualValue === value;
      case 'not_equals':
        return actualValue !== value;
      case 'contains':
        return String(actualValue).includes(String(value));
      case 'greater_than':
        return Number(actualValue) > Number(value);
      case 'less_than':
        return Number(actualValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(actualValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(actualValue);
      default:
        return false;
    }
  }

  private async handleNotificationAction(automation: any, context: any): Promise<void> {
    const { recipients, template, subject } = automation.config || {};
    
    if (!recipients || !template) {
      throw new Error('Notification action requires recipients and template');
    }

    const emailSubject = subject || `Notification from ${context.organizationName || 'Zephix'}`;
    await this.sendEmailNotification(recipients, emailSubject, context);
  }

  private async handleWebhookAction(automation: any, context: any): Promise<void> {
    const { url, headers, payload_template } = automation.config || {};
    
    if (!url) {
      throw new Error('Webhook action requires URL');
    }

    await this.sendCustomWebhook(url, context, headers);
  }

  private async handleStageTransitionAction(automation: any, context: any): Promise<void> {
    // This would integrate with the workflow service to move to next stage
    this.logger.log(`Stage transition automation triggered for instance ${context.instanceId}`);
  }

  private async handleAssignmentAction(automation: any, context: any): Promise<void> {
    // This would integrate with the workflow service to assign users
    this.logger.log(`Assignment automation triggered for instance ${context.instanceId}`);
  }
}

// Predefined webhook payload templates for common events
export const webhookEvents = {
  'intake.submitted': {
    event: 'intake.submitted',
    timestamp: '{{timestamp}}',
    data: {
      submissionId: '{{submissionId}}',
      formName: '{{formName}}',
      title: '{{title}}',
      submitter: {
        name: '{{submitterName}}',
        email: '{{submitterEmail}}',
      },
      formData: '{{formData}}',
      organizationId: '{{organizationId}}',
      priority: '{{priority}}',
    },
  },
  'workflow.instance_created': {
    event: 'workflow.instance_created',
    timestamp: '{{timestamp}}',
    data: {
      instanceId: '{{instanceId}}',
      templateId: '{{templateId}}',
      templateName: '{{templateName}}',
      title: '{{title}}',
      assignedTo: '{{assignedTo}}',
      createdBy: '{{createdBy}}',
      organizationId: '{{organizationId}}',
    },
  },
  'workflow.stage_completed': {
    event: 'workflow.stage_completed',
    timestamp: '{{timestamp}}',
    data: {
      instanceId: '{{instanceId}}',
      stageId: '{{stageId}}',
      stageName: '{{stageName}}',
      completedBy: '{{completedBy}}',
      duration: '{{duration}}',
      organizationId: '{{organizationId}}',
    },
  },
  'orr.ready_for_handoff': {
    event: 'orr.ready_for_handoff',
    timestamp: '{{timestamp}}',
    data: {
      orrId: '{{orrId}}',
      projectId: '{{projectId}}',
      projectName: '{{projectName}}',
      goLiveDate: '{{goLiveDate}}',
      applicationInventory: '{{applicationInventory}}',
      supportGroups: '{{supportGroups}}',
      documentation: '{{documentation}}',
      organizationId: '{{organizationId}}',
    },
  },
};
