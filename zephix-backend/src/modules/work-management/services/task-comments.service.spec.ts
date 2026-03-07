import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { TaskCommentsService } from './task-comments.service';
import { TaskComment } from '../entities/task-comment.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

describe('TaskCommentsService', () => {
  let service: TaskCommentsService;
  let commentRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    findAndCount: jest.Mock;
  };
  let taskRepo: { findOne: jest.Mock };

  const workspaceId = 'ws-1';
  const taskId = 'task-1';
  const auth = { organizationId: 'org-1', userId: 'user-1', platformRole: 'MEMBER' };

  beforeEach(async () => {
    commentRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      delete: jest.fn(async () => ({ affected: 1 })),
      findAndCount: jest.fn(async () => [[], 0]),
    };
    taskRepo = {
      findOne: jest.fn(async () => ({
        id: taskId,
        workspaceId,
        deletedAt: null,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsService,
        {
          provide: getTenantAwareRepositoryToken(TaskComment),
          useValue: commentRepo,
        },
        {
          provide: getTenantAwareRepositoryToken(WorkTask),
          useValue: taskRepo,
        },
        {
          provide: TaskActivityService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: TenantContextService,
          useValue: { assertOrganizationId: jest.fn().mockReturnValue('org-1') },
        },
        {
          provide: WorkspaceRoleGuardService,
          useValue: { getWorkspaceRole: jest.fn().mockResolvedValue('workspace_member') },
        },
      ],
    }).compile();

    service = module.get<TaskCommentsService>(TaskCommentsService);
  });

  it('allows owner to edit comment', async () => {
    commentRepo.findOne.mockResolvedValue({
      id: 'comment-1',
      taskId,
      workspaceId,
      createdByUserId: auth.userId,
      body: 'before',
      updatedByUserId: null,
    });

    const updated = await service.updateComment(
      auth,
      workspaceId,
      taskId,
      'comment-1',
      { body: 'after' },
    );

    expect(updated.body).toBe('after');
    expect(updated.updatedByUserId).toBe(auth.userId);
  });

  it('allows admin to edit comment not owned by them', async () => {
    commentRepo.findOne.mockResolvedValue({
      id: 'comment-2',
      taskId,
      workspaceId,
      createdByUserId: 'other-user',
      body: 'before',
      updatedByUserId: null,
    });

    const updated = await service.updateComment(
      { ...auth, platformRole: 'ADMIN' },
      workspaceId,
      taskId,
      'comment-2',
      { body: 'after' },
    );

    expect(updated.body).toBe('after');
  });

  it('allows elevated workspace role to delete comment', async () => {
    commentRepo.findOne.mockResolvedValue({
      id: 'comment-3',
      taskId,
      workspaceId,
      createdByUserId: 'other-user',
      body: 'to delete',
      updatedByUserId: null,
    });

    const workspaceRoleGuard = (service as any).workspaceRoleGuard;
    workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('delivery_owner');

    await expect(
      service.deleteComment(auth, workspaceId, taskId, 'comment-3'),
    ).resolves.not.toThrow();
    expect(commentRepo.delete).toHaveBeenCalledWith({
      id: 'comment-3',
      taskId,
      workspaceId,
    });
  });

  it('rejects edit when user is neither owner nor privileged role', async () => {
    commentRepo.findOne.mockResolvedValue({
      id: 'comment-4',
      taskId,
      workspaceId,
      createdByUserId: 'other-user',
      body: 'before',
      updatedByUserId: null,
    });

    const err = await service
      .updateComment(auth, workspaceId, taskId, 'comment-4', { body: 'after' })
      .then(() => null, (e) => e);

    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.response).toMatchObject({ code: 'TASK_COMMENT_FORBIDDEN' });
  });

  it('returns not found when comment does not exist', async () => {
    commentRepo.findOne.mockResolvedValue(null);

    const err = await service
      .deleteComment(auth, workspaceId, taskId, 'missing-comment')
      .then(() => null, (e) => e);

    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.response).toMatchObject({ code: 'TASK_COMMENT_NOT_FOUND' });
  });
});
