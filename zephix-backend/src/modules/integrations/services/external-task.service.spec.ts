import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { ExternalTaskService } from './external-task.service';
import { ExternalTask } from '../entities/external-task.entity';
import { ExternalTaskEvent } from '../entities/external-task-event.entity';
import { ExternalUserMappingService } from './external-user-mapping.service';
import { JiraIssue } from './jira-client.service';

describe('ExternalTaskService', () => {
  let service: ExternalTaskService;
  let externalTaskRepository: Repository<ExternalTask>;
  let externalTaskEventRepository: Repository<ExternalTaskEvent>;
  let userMappingService: ExternalUserMappingService;

  const mockExternalTaskRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockExternalTaskEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserMappingService = {
    findByEmail: jest.fn(),
  };

  const mockIssue: JiraIssue = {
    id: '12345',
    key: 'PROJ-123',
    fields: {
      summary: 'Test Issue',
      assignee: {
        emailAddress: 'assignee@example.com',
      },
      updated: '2025-01-15T10:00:00.000Z',
      duedate: '2025-01-20',
      timeoriginalestimate: 14400, // 4 hours in seconds
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalTaskService,
        {
          provide: getRepositoryToken(ExternalTask),
          useValue: mockExternalTaskRepository,
        },
        {
          provide: getRepositoryToken(ExternalTaskEvent),
          useValue: mockExternalTaskEventRepository,
        },
        {
          provide: ExternalUserMappingService,
          useValue: mockUserMappingService,
        },
      ],
    }).compile();

    service = module.get<ExternalTaskService>(ExternalTaskService);
    externalTaskRepository = module.get<Repository<ExternalTask>>(
      getRepositoryToken(ExternalTask),
    );
    externalTaskEventRepository = module.get<Repository<ExternalTaskEvent>>(
      getRepositoryToken(ExternalTaskEvent),
    );
    userMappingService = module.get<ExternalUserMappingService>(
      ExternalUserMappingService,
    );

    jest.clearAllMocks();
  });

  describe('upsertExternalTask', () => {
    it('should process new issue and create external task', async () => {
      const input = {
        organizationId: 'org-id',
        connectionId: 'conn-id',
        issue: mockIssue,
        externalSystem: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
      };

      // Mock: no existing event (idempotency check passes)
      mockExternalTaskEventRepository.create.mockReturnValue({
        idempotencyKey: 'jira:poll:conn-id:12345:2025-01-15T10:00:00.000Z',
        organizationId: 'org-id',
        externalSystem: 'jira',
        eventType: 'issue.updated',
        status: 'processed',
      });
      mockExternalTaskEventRepository.save.mockResolvedValue({});

      // Mock: no existing task
      mockExternalTaskRepository.findOne.mockResolvedValue(null);

      // Mock: no user mapping
      mockUserMappingService.findByEmail.mockResolvedValue(null);

      // Mock: create new task
      const newTask = {
        id: 'task-id',
        organizationId: 'org-id',
        externalSystem: 'jira',
        externalId: '12345',
        title: 'Test Issue',
        status: 'open',
        assigneeEmail: 'assignee@example.com',
        resourceId: undefined,
        dueDate: new Date('2025-01-20'),
        estimateHours: 4,
        externalUrl: 'https://test.atlassian.net/browse/PROJ-123',
        lastSyncedAt: new Date(),
      };
      mockExternalTaskRepository.create.mockReturnValue(newTask);
      mockExternalTaskRepository.save.mockResolvedValue(newTask);

      const result = await service.upsertExternalTask(input);

      expect(result).toBe(true); // Processed
      expect(mockExternalTaskEventRepository.save).toHaveBeenCalled();
      expect(mockExternalTaskRepository.save).toHaveBeenCalled();
    });

    it('should skip issue if idempotency key already exists (unique violation)', async () => {
      const input = {
        organizationId: 'org-id',
        connectionId: 'conn-id',
        issue: mockIssue,
        externalSystem: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
      };

      // Mock: unique constraint violation
      const uniqueError = new QueryFailedError('', [], {
        code: '23505',
        detail: 'Key (idempotency_key) already exists',
      } as any);
      mockExternalTaskEventRepository.create.mockReturnValue({});
      mockExternalTaskEventRepository.save.mockRejectedValue(uniqueError);

      const result = await service.upsertExternalTask(input);

      expect(result).toBe(false); // Skipped
      expect(mockExternalTaskEventRepository.save).toHaveBeenCalled();
      expect(mockExternalTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should resolve assigneeEmail to resourceId via user mapping', async () => {
      const input = {
        organizationId: 'org-id',
        connectionId: 'conn-id',
        issue: mockIssue,
        externalSystem: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
      };

      // Mock: idempotency check passes
      mockExternalTaskEventRepository.create.mockReturnValue({});
      mockExternalTaskEventRepository.save.mockResolvedValue({});

      // Mock: no existing task
      mockExternalTaskRepository.findOne.mockResolvedValue(null);

      // Mock: user mapping exists
      mockUserMappingService.findByEmail.mockResolvedValue({
        id: 'mapping-id',
        resourceId: 'resource-id',
        externalEmail: 'assignee@example.com',
      } as any);

      const newTask = {
        id: 'task-id',
        resourceId: 'resource-id',
      };
      mockExternalTaskRepository.create.mockReturnValue(newTask);
      mockExternalTaskRepository.save.mockResolvedValue(newTask);

      await service.upsertExternalTask(input);

      expect(mockUserMappingService.findByEmail).toHaveBeenCalledWith(
        'org-id',
        'jira',
        'assignee@example.com',
      );
      expect(mockExternalTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'resource-id',
        }),
      );
    });

    it('should update existing task if externalId matches', async () => {
      const input = {
        organizationId: 'org-id',
        connectionId: 'conn-id',
        issue: {
          ...mockIssue,
          fields: {
            ...mockIssue.fields,
            summary: 'Updated Summary',
          },
        },
        externalSystem: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
      };

      // Mock: idempotency check passes
      mockExternalTaskEventRepository.create.mockReturnValue({});
      mockExternalTaskEventRepository.save.mockResolvedValue({});

      // Mock: existing task found
      const existingTask = {
        id: 'task-id',
        organizationId: 'org-id',
        externalSystem: 'jira',
        externalId: '12345',
        title: 'Old Summary',
        status: 'open',
      };
      mockExternalTaskRepository.findOne.mockResolvedValue(
        existingTask as ExternalTask,
      );
      mockExternalTaskRepository.save.mockResolvedValue({
        ...existingTask,
        title: 'Updated Summary',
      } as ExternalTask);

      mockUserMappingService.findByEmail.mockResolvedValue(null);

      await service.upsertExternalTask(input);

      expect(mockExternalTaskRepository.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-id',
          externalSystem: 'jira',
          externalId: '12345',
        },
      });
      expect(mockExternalTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Summary',
        }),
      );
    });

    it('should assert second run produces zero new external_tasks writes for same idempotency keys', async () => {
      const input = {
        organizationId: 'org-id',
        connectionId: 'conn-id',
        issue: mockIssue,
        externalSystem: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
      };

      // First run: process issue
      mockExternalTaskEventRepository.create.mockReturnValue({});
      mockExternalTaskEventRepository.save.mockResolvedValue({});
      mockExternalTaskRepository.findOne.mockResolvedValue(null);
      mockUserMappingService.findByEmail.mockResolvedValue(null);
      mockExternalTaskRepository.create.mockReturnValue({ id: 'task-id' });
      mockExternalTaskRepository.save.mockResolvedValue({ id: 'task-id' });

      const firstResult = await service.upsertExternalTask(input);
      expect(firstResult).toBe(true);
      expect(mockExternalTaskRepository.save).toHaveBeenCalledTimes(1);

      // Reset mocks
      jest.clearAllMocks();

      // Second run: same issue (idempotency key collision)
      const uniqueError = new QueryFailedError('', [], {
        code: '23505',
        detail: 'Key (idempotency_key) already exists',
      } as any);
      mockExternalTaskEventRepository.create.mockReturnValue({});
      mockExternalTaskEventRepository.save.mockRejectedValue(uniqueError);

      const secondResult = await service.upsertExternalTask(input);
      expect(secondResult).toBe(false); // Skipped
      expect(mockExternalTaskRepository.save).not.toHaveBeenCalled(); // Zero writes
    });
  });
});





