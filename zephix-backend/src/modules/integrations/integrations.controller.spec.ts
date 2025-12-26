import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationConnectionService } from './services/integration-connection.service';
import { JiraClientService } from './services/jira-client.service';
import { IntegrationSyncService } from './services/integration-sync.service';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('IntegrationsController - Contract Tests', () => {
  let controller: IntegrationsController;
  let connectionService: IntegrationConnectionService;
  let jiraClientService: JiraClientService;
  let syncService: IntegrationSyncService;

  const mockUser = {
    id: 'user-id',
    organizationId: 'org-id',
    email: 'user@example.com',
  };

  const mockConnection = {
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

  const mockConnectionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConnectionService = {
    createConnection: jest.fn(),
    listConnections: jest.fn(),
    getConnectionById: jest.fn(),
    sanitizeConnection: jest.fn((conn) => {
      const { encryptedSecrets, ...sanitized } = conn;
      return sanitized;
    }),
  };

  const mockJiraClientService = {
    testConnection: jest.fn(),
  };

  const mockSyncService = {
    syncNow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationConnectionService,
          useValue: mockConnectionService,
        },
        {
          provide: JiraClientService,
          useValue: mockJiraClientService,
        },
        {
          provide: IntegrationSyncService,
          useValue: mockSyncService,
        },
      ],
    })
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    connectionService = module.get<IntegrationConnectionService>(
      IntegrationConnectionService,
    );
    jiraClientService = module.get<JiraClientService>(JiraClientService);
    syncService = module.get<IntegrationSyncService>(IntegrationSyncService);

    jest.clearAllMocks();
  });

  describe('POST /api/integrations', () => {
    it('should return { data: IntegrationConnection } format with no secrets', async () => {
      const dto = {
        type: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'plain-token',
      };

      const sanitized = mockConnectionService.sanitizeConnection(mockConnection);
      mockConnectionService.createConnection.mockResolvedValue(mockConnection);

      const result = await controller.createConnection(dto, mockUser);

      expect(result).toHaveProperty('data');
      expect(result.data).not.toHaveProperty('encryptedSecrets');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('type', 'jira');
      expect(result.data).toHaveProperty('baseUrl');
    });

    it('should scope by organizationId from JWT', async () => {
      const dto = {
        type: 'jira' as const,
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'plain-token',
      };

      mockConnectionService.createConnection.mockResolvedValue(mockConnection);

      await controller.createConnection(dto, mockUser);

      expect(mockConnectionService.createConnection).toHaveBeenCalledWith(
        'org-id',
        dto,
      );
    });
  });

  describe('GET /api/integrations', () => {
    it('should return { data: IntegrationConnection[] } format with no secrets', async () => {
      mockConnectionService.listConnections.mockResolvedValue([mockConnection]);

      const result = await controller.listConnections(mockUser);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0]).not.toHaveProperty('encryptedSecrets');
      expect(result.data[0]).toHaveProperty('id');
    });

    it('should return { data: [] } when no connections exist', async () => {
      mockConnectionService.listConnections.mockResolvedValue([]);

      const result = await controller.listConnections(mockUser);

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual([]);
    });

    it('should scope by organizationId from JWT', async () => {
      mockConnectionService.listConnections.mockResolvedValue([]);

      await controller.listConnections(mockUser);

      expect(mockConnectionService.listConnections).toHaveBeenCalledWith(
        'org-id',
      );
    });
  });

  describe('POST /api/integrations/:id/test', () => {
    it('should return { data: { connected, message } } format', async () => {
      mockConnectionService.getConnectionById.mockResolvedValue(mockConnection);
      mockJiraClientService.testConnection.mockResolvedValue({
        connected: true,
        message: 'Connection successful',
      });

      const result = await controller.testConnection('conn-id', {}, mockUser);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('connected', true);
      expect(result.data).toHaveProperty('message', 'Connection successful');
    });

    it('should map JiraClientService.testConnection result correctly', async () => {
      mockConnectionService.getConnectionById.mockResolvedValue(mockConnection);
      mockJiraClientService.testConnection.mockResolvedValue({
        connected: false,
        message: 'Connection failed: 401 Unauthorized',
      });

      const result = await controller.testConnection('conn-id', {}, mockUser);

      expect(result.data.connected).toBe(false);
      expect(result.data.message).toContain('Connection failed');
    });

    it('should throw NotFoundException if connection not found', async () => {
      mockConnectionService.getConnectionById.mockResolvedValue(null);

      await expect(
        controller.testConnection('conn-id', {}, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should scope by organizationId from JWT', async () => {
      mockConnectionService.getConnectionById.mockResolvedValue(mockConnection);
      mockJiraClientService.testConnection.mockResolvedValue({
        connected: true,
        message: 'Success',
      });

      await controller.testConnection('conn-id', {}, mockUser);

      expect(mockConnectionService.getConnectionById).toHaveBeenCalledWith(
        'conn-id',
        'org-id',
      );
    });
  });

  describe('POST /api/integrations/:id/sync-now', () => {
    it('should return { data: { status, issuesProcessed } } format', async () => {
      mockSyncService.syncNow.mockResolvedValue({
        status: 'success',
        issuesProcessed: 5,
        totalIssues: 5,
      });

      const result = await controller.syncNow('conn-id', {}, mockUser);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status', 'success');
      expect(result.data).toHaveProperty('issuesProcessed', 5);
    });

    it('should scope by organizationId from JWT', async () => {
      mockSyncService.syncNow.mockResolvedValue({
        status: 'success',
        issuesProcessed: 0,
        totalIssues: 0,
      });

      await controller.syncNow('conn-id', {}, mockUser);

      expect(mockSyncService.syncNow).toHaveBeenCalledWith('conn-id', 'org-id');
    });
  });
});


