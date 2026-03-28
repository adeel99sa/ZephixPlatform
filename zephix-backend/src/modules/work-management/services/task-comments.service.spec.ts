import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskCommentsService } from './task-comments.service';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { TaskComment } from '../entities/task-comment.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkTaskStructuralGuardService } from './work-task-structural-guard.service';

describe('TaskCommentsService (F-2 comment exception model)', () => {
  let service: TaskCommentsService;
  let taskRepo: { findOne: jest.Mock };
  let projectRepo: { findOne: jest.Mock };
  let commentRepo: { create: jest.Mock; save: jest.Mock };

  const auth = { organizationId: 'org-1', userId: 'u1', platformRole: 'MEMBER' };
  const workspaceId = 'ws-1';
  const taskId = 'task-1';

  beforeEach(async () => {
    taskRepo = { findOne: jest.fn() };
    projectRepo = { findOne: jest.fn() };
    commentRepo = {
      create: jest.fn((x) => x),
      save: jest.fn().mockImplementation((x) => Promise.resolve({ id: 'c1', ...x })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsService,
        { provide: getTenantAwareRepositoryToken(TaskComment), useValue: commentRepo },
        { provide: getTenantAwareRepositoryToken(WorkTask), useValue: taskRepo },
        { provide: TaskActivityService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: TenantContextService,
          useValue: { assertOrganizationId: jest.fn().mockReturnValue('org-1') },
        },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        WorkTaskStructuralGuardService,
      ],
    }).compile();

    service = module.get(TaskCommentsService);
  });

  function stubTask(projectId = 'proj-1') {
    taskRepo.findOne.mockResolvedValue({
      id: taskId,
      workspaceId,
      projectId,
      deletedAt: null,
    });
  }

  it('allows addComment when project is ON_HOLD (lighter path)', async () => {
    stubTask();
    projectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      state: ProjectState.ON_HOLD,
      organizationId: 'org-1',
      workspaceId,
      deletedAt: null,
    });

    const r = await service.addComment(auth, workspaceId, taskId, { body: 'hello' });
    expect(r.id).toBeDefined();
    expect(commentRepo.save).toHaveBeenCalled();
  });

  it('allows addComment when project ACTIVE and phase would be COMPLETE (no phase gate on comments)', async () => {
    stubTask();
    projectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      state: ProjectState.ACTIVE,
      organizationId: 'org-1',
      workspaceId,
      deletedAt: null,
    });

    await service.addComment(auth, workspaceId, taskId, { body: 'note' });
    expect(commentRepo.save).toHaveBeenCalled();
  });

  it('blocks addComment when project is TERMINATED', async () => {
    stubTask();
    projectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      state: ProjectState.TERMINATED,
      organizationId: 'org-1',
      workspaceId,
      deletedAt: null,
    });

    await expect(
      service.addComment(auth, workspaceId, taskId, { body: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(commentRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFound when task missing', async () => {
    taskRepo.findOne.mockResolvedValue(null);
    await expect(
      service.addComment(auth, workspaceId, taskId, { body: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
