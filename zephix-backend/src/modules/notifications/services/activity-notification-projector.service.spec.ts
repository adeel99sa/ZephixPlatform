import { Test, TestingModule } from '@nestjs/testing';
import {
  ActivityNotificationProjectorService,
} from './activity-notification-projector.service';
import { NotificationDispatchService } from '../notification-dispatch.service';
import { TaskActivityType } from '../../work-management/enums/task.enums';

describe('ActivityNotificationProjectorService', () => {
  let projector: ActivityNotificationProjectorService;
  let dispatchService: Record<string, jest.Mock>;

  const baseEvent = {
    activityId: 'activity-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId: 'project-1',
    taskId: null,
    actorUserId: 'actor-1',
    payload: null,
  };

  beforeEach(async () => {
    dispatchService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityNotificationProjectorService,
        { provide: NotificationDispatchService, useValue: dispatchService },
      ],
    }).compile();

    projector = module.get(ActivityNotificationProjectorService);
  });

  describe('handleActivityRecorded', () => {
    it('should dispatch notification for GATE_APPROVAL_STEP_ACTIVATED', async () => {
      await projector.handleActivityRecorded({
        ...baseEvent,
        type: TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED,
        payload: {
          submissionId: 'sub-1',
          chainId: 'chain-1',
          stepId: 'step-1',
          stepOrder: 1,
          stepName: 'PM Review',
        },
      });

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        'actor-1', // target user
        'org-1',
        'ws-1',
        'GATE_APPROVAL_STEP_ACTIVATED',
        expect.stringContaining('Gate approval step activated'),
        expect.any(String),
        expect.objectContaining({ submissionId: 'sub-1' }),
        'high',
      );
    });

    it('should dispatch notification for GATE_APPROVAL_STEP_APPROVED', async () => {
      await projector.handleActivityRecorded({
        ...baseEvent,
        type: TaskActivityType.GATE_APPROVAL_STEP_APPROVED,
        payload: {
          submissionId: 'sub-1',
          submittedByUserId: 'submitter-1',
          stepName: 'PM Review',
          decision: 'APPROVED',
        },
      });

      // Target should be the submitter, not the actor
      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        'submitter-1',
        expect.anything(),
        expect.anything(),
        'GATE_APPROVAL_STEP_APPROVED',
        expect.stringContaining('approved'),
        expect.any(String),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should dispatch notification for GATE_APPROVAL_STEP_REJECTED', async () => {
      await projector.handleActivityRecorded({
        ...baseEvent,
        type: TaskActivityType.GATE_APPROVAL_STEP_REJECTED,
        payload: {
          submissionId: 'sub-1',
          submittedByUserId: 'submitter-1',
          decision: 'REJECTED',
        },
      });

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        'submitter-1',
        expect.anything(),
        expect.anything(),
        'GATE_APPROVAL_STEP_REJECTED',
        expect.stringContaining('rejected'),
        expect.anything(),
        expect.anything(),
        'high',
      );
    });

    it('should dispatch notification for GATE_APPROVAL_CHAIN_COMPLETED', async () => {
      await projector.handleActivityRecorded({
        ...baseEvent,
        type: TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED,
        payload: {
          submissionId: 'sub-1',
          submittedByUserId: 'submitter-1',
          chainId: 'chain-1',
        },
      });

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        'submitter-1',
        expect.anything(),
        expect.anything(),
        'GATE_APPROVAL_CHAIN_COMPLETED',
        expect.stringContaining('completed'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should dispatch notification for GATE_APPROVAL_ESCALATED', async () => {
      await projector.handleActivityRecorded({
        ...baseEvent,
        type: TaskActivityType.GATE_APPROVAL_ESCALATED,
        payload: {
          submissionId: 'sub-1',
          escalationHours: 72,
        },
      });

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        'actor-1', // falls back to actor
        expect.anything(),
        expect.anything(),
        'GATE_APPROVAL_ESCALATED',
        expect.stringContaining('overdue'),
        expect.anything(),
        expect.anything(),
        'urgent',
      );
    });

    it('should NOT dispatch for unmapped activity types', async () => {
      await projector.handleActivityRecorded({
        ...baseEvent,
        type: TaskActivityType.TASK_COMMENT_ADDED,
        payload: {},
      });

      expect(dispatchService.dispatch).not.toHaveBeenCalled();
    });

    it('should not throw on dispatch failure (fail-open)', async () => {
      dispatchService.dispatch.mockRejectedValue(new Error('DB down'));

      // Should not throw
      await expect(
        projector.handleActivityRecorded({
          ...baseEvent,
          type: TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED,
          payload: {},
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Slack eligibility', () => {
    it('should mark STEP_ACTIVATED as Slack eligible', () => {
      expect(
        projector.isSlackEligible(TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED),
      ).toBe(true);
    });

    it('should mark STEP_REJECTED as Slack eligible', () => {
      expect(
        projector.isSlackEligible(TaskActivityType.GATE_APPROVAL_STEP_REJECTED),
      ).toBe(true);
    });

    it('should NOT mark CHAIN_COMPLETED as Slack eligible', () => {
      expect(
        projector.isSlackEligible(TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED),
      ).toBe(false);
    });

    it('should NOT mark ESCALATED as Slack eligible', () => {
      expect(
        projector.isSlackEligible(TaskActivityType.GATE_APPROVAL_ESCALATED),
      ).toBe(false);
    });

    it('should mark TASK_ASSIGNED as Slack eligible (existing)', () => {
      expect(
        projector.isSlackEligible(TaskActivityType.TASK_ASSIGNED),
      ).toBe(true);
    });
  });
});
