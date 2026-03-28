import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getTenantAwareRepositoryToken,
} from '../../../tenancy/tenancy.module';
import { TenantContextService } from '../../../tenancy/tenant-context.service';
import { TaskActivityService } from '../task-activity.service';
import { TaskActivity } from '../../entities/task-activity.entity';
import { WorkTask } from '../../entities/work-task.entity';
import { TaskActivityType } from '../../enums/task.enums';

describe('TaskActivityService', () => {
  const activityRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };
  const taskRepo = {
    findOne: jest.fn(),
  };
  const tenantContext = {
    assertOrganizationId: jest.fn().mockReturnValue('org-1'),
  };
  const eventEmitter = {
    emit: jest.fn(),
  };

  let service: TaskActivityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskActivityService,
        {
          provide: getTenantAwareRepositoryToken(TaskActivity),
          useValue: activityRepo,
        },
        {
          provide: getTenantAwareRepositoryToken(WorkTask),
          useValue: taskRepo,
        },
        {
          provide: TenantContextService,
          useValue: tenantContext,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();
    service = moduleRef.get(TaskActivityService);
  });

  it('emits activity.recorded after saving activity', async () => {
    taskRepo.findOne.mockResolvedValue({ id: 'task-1', projectId: 'project-1' });
    activityRepo.create.mockReturnValue({
      id: 'activity-1',
      workspaceId: 'ws-1',
      projectId: 'project-1',
      taskId: 'task-1',
      type: TaskActivityType.TASK_ASSIGNED,
      actorUserId: 'user-1',
      payload: { assigneeId: 'user-2' },
    });
    activityRepo.save.mockImplementation(async (value) => value);

    await service.record(
      { organizationId: 'org-1', userId: 'user-1', platformRole: 'MEMBER' },
      'ws-1',
      'task-1',
      TaskActivityType.TASK_ASSIGNED,
      { assigneeId: 'user-2' },
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'activity.recorded',
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'project-1',
        taskId: 'task-1',
        type: TaskActivityType.TASK_ASSIGNED,
      }),
    );
  });

  it('uses metadata projectId fallback when task lookup misses', async () => {
    taskRepo.findOne.mockResolvedValue(null);
    activityRepo.create.mockReturnValue({
      id: 'activity-2',
      projectId: 'project-fallback',
      workspaceId: 'ws-1',
      taskId: null,
      type: TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED,
      actorUserId: 'user-1',
      payload: { projectId: 'project-fallback' },
    });
    activityRepo.save.mockImplementation(async (value) => value);

    await service.record(
      { organizationId: 'org-1', userId: 'user-1' },
      'ws-1',
      null,
      TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED,
      { projectId: 'project-fallback' },
    );

    expect(eventEmitter.emit).toHaveBeenCalled();
  });
});

