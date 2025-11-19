import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WorkflowNotificationService {
  private readonly logger = new Logger(WorkflowNotificationService.name);

  async sendWorkflowNotification(
    type: string,
    data: any,
    recipients: string[],
  ): Promise<void> {
    this.logger.log(
      `Sending workflow notification: ${type} to ${recipients.length} recipients`,
    );

    // This is a placeholder implementation
    // In production, this would send notifications via email, Slack, etc.

    for (const recipient of recipients) {
      this.logger.debug(`Sending ${type} notification to: ${recipient}`);
      // In production: await this.emailService.send(recipient, type, data);
      // In production: await this.slackService.send(recipient, type, data);
    }
  }

  async notifyStageTransition(
    workflowInstanceId: string,
    stageId: string,
    oldStatus: string,
    newStatus: string,
    recipients: string[],
  ): Promise<void> {
    await this.sendWorkflowNotification(
      'stage_transition',
      {
        workflowInstanceId,
        stageId,
        oldStatus,
        newStatus,
        timestamp: new Date(),
      },
      recipients,
    );
  }

  async notifyApprovalRequired(
    workflowInstanceId: string,
    approvalId: string,
    recipients: string[],
  ): Promise<void> {
    await this.sendWorkflowNotification(
      'approval_required',
      {
        workflowInstanceId,
        approvalId,
        timestamp: new Date(),
      },
      recipients,
    );
  }
}
