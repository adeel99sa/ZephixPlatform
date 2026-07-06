import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ActivityNotificationProjectorService,
} from './activity-notification-projector.service';
import { NotificationDispatchService } from '../notification-dispatch.service';
import { TaskActivityType } from '../../work-management/enums/task.enums';
import { User } from '../../users/entities/user.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';

describe('ActivityNotificationProjectorService', () => {
  let projector: ActivityNotificationProjectorService;
  let dispatchService: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let workTaskRepo: Record<string, jest.Mock>;
  let projectRepo: Record<string, jest.Mock>;

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
    userRepo = { findOne: jest.fn().mockResolvedValue(null) };
    workTaskRepo = { findOne: jest.fn().mockResolvedValue(null) };
    projectRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityNotificationProjectorService,
        { provide: NotificationDispatchService, useValue: dispatchService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(WorkTask), useValue: workTaskRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
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

  describe('TASK_STATUS_CHANGED enrichment', () => {
    const statusChangedEvent = {
      ...baseEvent,
      taskId: 'task-1',
      type: TaskActivityType.TASK_STATUS_CHANGED,
      payload: { oldStatus: 'TODO', newStatus: 'DONE' },
    };

    it('dispatches enriched title with actorDisplayName, taskTitle, newStatus', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'actor-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@z.dev' });
      workTaskRepo.findOne.mockResolvedValue({ id: 'task-1', title: 'Wire up the API' });
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', name: 'Alpha Project' });

      await projector.handleActivityRecorded(statusChangedEvent);

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        TaskActivityType.TASK_STATUS_CHANGED,
        "Ada Lovelace moved 'Wire up the API' to DONE",
        'In Alpha Project',
        expect.any(Object),
        expect.any(String),
      );
    });

    it('mirrors workspaceId into data payload', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'actor-1', firstName: 'Ada', lastName: null, email: 'ada@z.dev' });
      workTaskRepo.findOne.mockResolvedValue({ id: 'task-1', title: 'A Task' });
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', name: 'Project' });

      await projector.handleActivityRecorded(statusChangedEvent);

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ workspaceId: 'ws-1' }),
        expect.any(String),
      );
    });

    it('falls back to generic copy when user lookup throws — notification is never dropped', async () => {
      userRepo.findOne.mockRejectedValue(new Error('DB down'));
      workTaskRepo.findOne.mockResolvedValue({ id: 'task-1', title: 'A Task' });
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', name: 'Project' });

      await projector.handleActivityRecorded(statusChangedEvent);

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        TaskActivityType.TASK_STATUS_CHANGED,
        'Task status changed',
        'A task status has been updated',
        expect.any(Object),
        expect.any(String),
      );
    });

    it('falls back to generic copy when task lookup throws — notification is never dropped', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'actor-1', firstName: 'Ada', lastName: 'L', email: 'a@z.dev' });
      workTaskRepo.findOne.mockRejectedValue(new Error('timeout'));
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', name: 'Project' });

      await projector.handleActivityRecorded(statusChangedEvent);

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        TaskActivityType.TASK_STATUS_CHANGED,
        'Task status changed',
        'A task status has been updated',
        expect.any(Object),
        expect.any(String),
      );
    });

    it('uses email as actorDisplayName when firstName+lastName are both null', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'actor-1', firstName: null, lastName: null, email: 'robot@z.dev' });
      workTaskRepo.findOne.mockResolvedValue({ id: 'task-1', title: 'Task X' });
      projectRepo.findOne.mockResolvedValue({ id: 'project-1', name: 'Project Y' });

      await projector.handleActivityRecorded(statusChangedEvent);

      expect(dispatchService.dispatch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        TaskActivityType.TASK_STATUS_CHANGED,
        "robot@z.dev moved 'Task X' to DONE",
        'In Project Y',
        expect.any(Object),
        expect.any(String),
      );
    });
  });
});
