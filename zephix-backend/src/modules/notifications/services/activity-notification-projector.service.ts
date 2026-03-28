import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationDispatchService } from '../notification-dispatch.service';
import { TaskActivityType } from '../../work-management/enums/task.enums';
import { NotificationPriority } from '../entities/notification.entity';

interface ActivityRecordedEvent {
  activityId: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  taskId: string | null;
  type: TaskActivityType;
  actorUserId: string;
  payload: Record<string, any> | null;
}

interface NotificationMapping {
  title: string;
  body?: string;
  priority?: NotificationPriority;
  /** Target userId — null means use actorUserId */
  targetUserIdField?: string;
  /** Whether this event is eligible for Slack routing */
  slackEligible?: boolean;
}

/**
 * Maps activity events to user notifications.
 * Listens for 'activity.recorded' events and dispatches notifications
 * through the NotificationDispatchService.
 *
 * Sprint 10: Adds 5 gate approval chain activity types.
 */
@Injectable()
export class ActivityNotificationProjectorService {
  private readonly logger = new Logger(ActivityNotificationProjectorService.name);

  constructor(
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  /**
   * Notification map for gate approval chain events.
   * Each entry defines how to transform an activity into a user notification.
   */
  private readonly NOTIFICATION_MAP: Partial<Record<TaskActivityType, NotificationMapping>> = {
    // ─── Sprint 9: Existing mappings ──────────────────────────────
    [TaskActivityType.TASK_ASSIGNED]: {
      title: 'Task assigned to you',
      body: 'You have been assigned a new task',
      slackEligible: true,
    },
    [TaskActivityType.TASK_STATUS_CHANGED]: {
      title: 'Task status changed',
      body: 'A task status has been updated',
    },

    // ─── Sprint 10: Gate approval chain events ────────────────────
    [TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED]: {
      title: 'Gate approval step activated — your action required',
      body: 'A gate approval step has been activated and requires your review',
      priority: NotificationPriority.HIGH,
      slackEligible: true,
    },
    [TaskActivityType.GATE_APPROVAL_STEP_APPROVED]: {
      title: 'Gate approval step approved',
      body: 'An approval step has been completed',
    },
    [TaskActivityType.GATE_APPROVAL_STEP_REJECTED]: {
      title: 'Gate approval step rejected',
      body: 'An approval step has been rejected — review required',
      priority: NotificationPriority.HIGH,
      slackEligible: true,
    },
    [TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED]: {
      title: 'Gate approval chain completed',
      body: 'All approval steps have been completed for a gate submission',
      priority: NotificationPriority.NORMAL,
    },
    [TaskActivityType.GATE_APPROVAL_ESCALATED]: {
      title: 'Gate approval overdue — escalation triggered',
      body: 'An approval step has exceeded the configured time limit',
      priority: NotificationPriority.URGENT,
      slackEligible: false, // escalation is internal signal
    },
  };

  /**
   * Slack-eligible events — only these get routed to Slack channels.
   * Per architect spec: only STEP_ACTIVATED and STEP_REJECTED for Sprint 10.
   */
  private readonly SLACK_ELIGIBLE_EVENTS = new Set<TaskActivityType>([
    TaskActivityType.TASK_ASSIGNED,
    TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED,
    TaskActivityType.GATE_APPROVAL_STEP_REJECTED,
  ]);

  @OnEvent('activity.recorded')
  async handleActivityRecorded(event: ActivityRecordedEvent): Promise<void> {
    try {
      const mapping = this.NOTIFICATION_MAP[event.type];
      if (!mapping) {
        // Not mapped — no notification for this event type
        return;
      }

      // Build notification context from event payload
      const payload = event.payload || {};
      const title = this.interpolateTitle(mapping.title, payload);
      const body = mapping.body
        ? this.interpolateTitle(mapping.body, payload)
        : null;

      // Determine target user(s)
      // For gate approval events, the target is the step approver (from payload),
      // not the actor who triggered the event
      const targetUserId = this.resolveTargetUserId(event, payload);

      if (!targetUserId) {
        this.logger.debug(
          `Skipping notification for ${event.type}: no target user resolved`,
        );
        return;
      }

      // Dispatch in-app notification
      await this.dispatchService.dispatch(
        targetUserId,
        event.organizationId,
        event.workspaceId,
        event.type,
        title,
        body,
        {
          activityId: event.activityId,
          projectId: event.projectId,
          taskId: event.taskId,
          ...payload,
        },
        mapping.priority || NotificationPriority.NORMAL,
      );

      this.logger.debug(
        `Notification dispatched for ${event.type} to user ${targetUserId}`,
      );
    } catch (error) {
      // Fail-open: notification projection must never break activity recording
      this.logger.error(
        `Notification projection failed for ${event.type}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Resolve target user for the notification.
   * Gate approval events target the approver, not the actor.
   */
  private resolveTargetUserId(
    event: ActivityRecordedEvent,
    payload: Record<string, any>,
  ): string | null {
    switch (event.type) {
      case TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED:
        // Target: the step's required user, or fall back to actor
        return payload.requiredUserId || event.actorUserId;
      case TaskActivityType.GATE_APPROVAL_STEP_APPROVED:
      case TaskActivityType.GATE_APPROVAL_STEP_REJECTED:
        // Notify the submission owner (submitter) about step decisions
        return payload.submittedByUserId || event.actorUserId;
      case TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED:
        // Notify submitter that chain is complete
        return payload.submittedByUserId || event.actorUserId;
      case TaskActivityType.GATE_APPROVAL_ESCALATED:
        // Notify the project manager or the actor as fallback
        return payload.escalateToUserId || event.actorUserId;
      default:
        // Default: notify actor (for task events, this is typically the assignee from payload)
        return payload.assigneeId || event.actorUserId;
    }
  }

  /**
   * Simple title interpolation — replaces {key} with payload values.
   */
  private interpolateTitle(template: string, payload: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return payload[key] != null ? String(payload[key]) : `{${key}}`;
    });
  }

  /**
   * Check if an event type is eligible for Slack routing.
   * Used by Slack integration layer.
   */
  isSlackEligible(eventType: TaskActivityType): boolean {
    return this.SLACK_ELIGIBLE_EVENTS.has(eventType);
  }
}
