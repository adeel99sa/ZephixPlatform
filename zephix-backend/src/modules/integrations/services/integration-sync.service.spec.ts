import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationSyncService } from './integration-sync.service';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { JiraClientService } from './jira-client.service';
import { ExternalTaskService } from './external-task.service';
import { DomainEventsPublisher } from '../../domain-events/domain-events.publisher';
import { NotFoundException } from '@nestjs/common';
import { JiraIssue, JiraSearchResponse } from './jira-client.service';

describe('IntegrationSyncService', () => {
  let service: IntegrationSyncService;
  let connectionRepository: Repository<IntegrationConnection>;
  let jiraClientService: JiraClientService;
  let externalTaskService: ExternalTaskService;
  let domainEventsPublisher: DomainEventsPublisher;

  const mockConnection: IntegrationConnection = {
    id: 'conn-id',
    organizationId: 'org-id',
    type: 'jira',
    baseUrl: 'https://test.atlassian.net',
    email: 'test@example.com',
    authType: 'api_token',
    encryptedSecrets: {
      apiToken: 'encrypted-token',
    },
    enabled: true,
    pollingEnabled: false,
    webhookEnabled: false,
    status: 'active',
    errorCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {} as any,
  } as IntegrationConnection;

  const mockIssue1: JiraIssue = {
    id: '12345',
    key: 'PROJ-123',
    fields: {
      summary: 'Issue 1',
      updated: '2025-01-15T10:00:00.000Z',
    },
  };

  const mockIssue2: JiraIssue = {
    id: '67890',
    key: 'PROJ-456',
    fields: {
      summary: 'Issue 2',
      updated: '2025-01-15T11:00:00.000Z',
    },
  };

  const mockSearchResponse: JiraSearchResponse = {
    total: 2,
    startAt: 0,
    maxResults: 50,
    issues: [mockIssue1, mockIssue2],
  };

  const mockConnectionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJiraClientService = {
    searchIssues: jest.fn(),
  };

  const mockExternalTaskService = {
    upsertExternalTask: jest.fn(),
  };

  const mockDomainEventsPublisher = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationSyncService,
        {
          provide: getRepositoryToken(IntegrationConnection),
          useValue: mockConnectionRepository,
        },
        {
          provide: JiraClientService,
          useValue: mockJiraClientService,
        },
        {
          provide: ExternalTaskService,
          useValue: mockExternalTaskService,
        },
        {
          provide: DomainEventsPublisher,
          useValue: mockDomainEventsPublisher,
        },
      ],
    }).compile();

    service = module.get<IntegrationSyncService>(IntegrationSyncService);
    connectionRepository = module.get<Repository<IntegrationConnection>>(
      getRepositoryToken(IntegrationConnection),
    );
    jiraClientService = module.get<JiraClientService>(JiraClientService);
    externalTaskService = module.get<ExternalTaskService>(ExternalTaskService);
    domainEventsPublisher = module.get<DomainEventsPublisher>(
      DomainEventsPublisher,
    );

    jest.clearAllMocks();
  });

  describe('syncNow', () => {
    it('should load connection by id and org, call JiraClientService, and process issues', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(mockConnection);
      mockJiraClientService.searchIssues.mockResolvedValue(mockSearchResponse);
      mockExternalTaskService.upsertExternalTask
        .mockResolvedValueOnce(true) // Issue 1 processed
        .mockResolvedValueOnce(true); // Issue 2 processed
      mockDomainEventsPublisher.publish.mockResolvedValue(undefined);
      mockConnectionRepository.save.mockResolvedValue(mockConnection);

      const result = await service.syncNow('conn-id', 'org-id');

      expect(mockConnectionRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'conn-id',
          organizationId: 'org-id',
        },
      });
      expect(mockJiraClientService.searchIssues).toHaveBeenCalledWith(
        mockConnection,
        'ORDER BY updated DESC',
        0,
        50,
      );
      expect(mockExternalTaskService.upsertExternalTask).toHaveBeenCalledTimes(2);
      expect(mockDomainEventsPublisher.publish).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
      expect(result.issuesProcessed).toBe(2);
      expect(result.totalIssues).toBe(2);
    });

    it('should throw NotFoundException if connection not found', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(null);

      await expect(service.syncNow('conn-id', 'org-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only count processed issues, not skipped ones (idempotency)', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(mockConnection);
      mockJiraClientService.searchIssues.mockResolvedValue(mockSearchResponse);
      // First issue processed, second skipped (idempotency)
      mockExternalTaskService.upsertExternalTask
        .mockResolvedValueOnce(true) // Processed
        .mockResolvedValueOnce(false); // Skipped
      mockDomainEventsPublisher.publish.mockResolvedValue(undefined);
      mockConnectionRepository.save.mockResolvedValue(mockConnection);

      const result = await service.syncNow('conn-id', 'org-id');

      expect(result.issuesProcessed).toBe(1); // Only 1 processed
      expect(result.totalIssues).toBe(2); // But 2 total fetched
      expect(mockDomainEventsPublisher.publish).toHaveBeenCalledTimes(1); // Only 1 event
    });

    it('should use jqlFilter from connection if present', async () => {
      const connectionWithJql = {
        ...mockConnection,
        jqlFilter: 'project = PROJ AND status = "In Progress"',
      };
      mockConnectionRepository.findOne.mockResolvedValue(connectionWithJql);
      mockJiraClientService.searchIssues.mockResolvedValue({
        ...mockSearchResponse,
        issues: [],
      });
      mockConnectionRepository.save.mockResolvedValue(connectionWithJql);

      await service.syncNow('conn-id', 'org-id');

      expect(mockJiraClientService.searchIssues).toHaveBeenCalledWith(
        connectionWithJql,
        'project = PROJ AND status = "In Progress"',
        0,
        50,
      );
    });

    it('should handle partial failures and continue processing', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(mockConnection);
      mockJiraClientService.searchIssues.mockResolvedValue(mockSearchResponse);
      mockExternalTaskService.upsertExternalTask
        .mockResolvedValueOnce(true) // Issue 1 succeeds
        .mockRejectedValueOnce(new Error('Processing failed')); // Issue 2 fails
      mockDomainEventsPublisher.publish.mockResolvedValue(undefined);
      mockConnectionRepository.save.mockResolvedValue(mockConnection);

      const result = await service.syncNow('conn-id', 'org-id');

      expect(result.status).toBe('partial');
      expect(result.issuesProcessed).toBe(1);
      expect(result.errorMessage).toContain('1 issue(s) failed');
      expect(mockDomainEventsPublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('should update connection lastSyncRunAt and lastSyncStatus', async () => {
      mockConnectionRepository.findOne.mockResolvedValue(mockConnection);
      mockJiraClientService.searchIssues.mockResolvedValue({
        ...mockSearchResponse,
        issues: [],
      });
      mockConnectionRepository.save.mockResolvedValue(mockConnection);

      await service.syncNow('conn-id', 'org-id');

      expect(mockConnectionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSyncRunAt: expect.any(Date),
          lastSyncStatus: 'success',
        }),
      );
    });
  });
});


