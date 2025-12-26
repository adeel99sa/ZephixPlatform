import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationsWebhookController } from './integrations-webhook.controller';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationEncryptionService } from './services/integration-encryption.service';
import { BadRequestException } from '@nestjs/common';

describe('IntegrationsWebhookController - Contract Tests', () => {
  let controller: IntegrationsWebhookController;
  let connectionRepository: Repository<IntegrationConnection>;

  const mockConnectionDisabled = {
    id: 'conn-id',
    organizationId: 'org-id',
    type: 'jira',
    baseUrl: 'https://test.atlassian.net',
    email: 'test@example.com',
    webhookEnabled: false,
    webhookSecret: null,
  } as IntegrationConnection;

  const mockConnectionEnabled = {
    ...mockConnectionDisabled,
    webhookEnabled: true,
    webhookSecret: 'secret-key',
  } as IntegrationConnection;

  const mockRepository = {
    findOne: jest.fn(),
  };

  const mockEncryptionService = {
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsWebhookController],
      providers: [
        {
          provide: getRepositoryToken(IntegrationConnection),
          useValue: mockRepository,
        },
        {
          provide: IntegrationEncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    controller = module.get<IntegrationsWebhookController>(
      IntegrationsWebhookController,
    );
    connectionRepository = module.get<Repository<IntegrationConnection>>(
      getRepositoryToken(IntegrationConnection),
    );

    jest.clearAllMocks();
  });

  describe('POST /api/integrations/jira/webhook/:connectionId', () => {
    it('should return 202 with status "ignored" when webhookEnabled is false', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockConnectionDisabled);

      const result = await controller.handleWebhook('conn-id', payload);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status', 'ignored');
      expect(result.data).toHaveProperty('message');
      expect(result.data.message).toContain('disabled');
      expect(result.data).toHaveProperty('connectionId', 'conn-id');
    });

    it('should return 202 with status "accepted" when webhookEnabled is true', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabled);

      const result = await controller.handleWebhook('conn-id', payload);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status', 'accepted');
      expect(result.data).toHaveProperty('message');
      expect(result.data.message).toContain('received');
      expect(result.data).toHaveProperty('connectionId', 'conn-id');
    });

    it('should throw BadRequestException if connection not found', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.handleWebhook('conn-id', payload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return { data } format (no secrets)', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabled);

      const result = await controller.handleWebhook('conn-id', payload);

      expect(result).toHaveProperty('data');
      expect(result.data).not.toHaveProperty('webhookSecret');
      expect(result.data).not.toHaveProperty('encryptedSecrets');
    });
  });
});


