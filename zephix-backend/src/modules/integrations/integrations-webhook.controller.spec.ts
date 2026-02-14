import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IntegrationsWebhookController } from './integrations-webhook.controller';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationEncryptionService } from './services/integration-encryption.service';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';

describe('IntegrationsWebhookController — Guard Enforcement', () => {
  function getMethodGuards(target: any, method: string): Function[] {
    const guards = Reflect.getMetadata('__guards__', target[method]) || [];
    return guards.map((g: any) => (typeof g === 'function' ? g : g?.constructor));
  }

  it('handleWebhook has RateLimiterGuard', () => {
    const guards = getMethodGuards(
      IntegrationsWebhookController.prototype,
      'handleWebhook',
    );
    expect(guards).toContain(RateLimiterGuard);
  });
});

describe('IntegrationsWebhookController - Security Tests', () => {
  let controller: IntegrationsWebhookController;

  const WEBHOOK_SECRET = 'test-webhook-secret-key';

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
    webhookSecret: WEBHOOK_SECRET,
  } as IntegrationConnection;

  const mockConnectionEnabledNoSecret = {
    ...mockConnectionDisabled,
    webhookEnabled: true,
    webhookSecret: null,
  } as IntegrationConnection;

  const mockRepository = {
    findOne: jest.fn(),
  };

  const mockEncryptionService = {
    decrypt: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  function computeSignature(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsWebhookController],
      providers: [
        {
          provide: getTenantAwareRepositoryToken(IntegrationConnection),
          useValue: mockRepository,
        },
        {
          provide: IntegrationEncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<IntegrationsWebhookController>(
      IntegrationsWebhookController,
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
      const body = JSON.stringify(payload);
      const sig = computeSignature(body, WEBHOOK_SECRET);

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabled);

      const result = await controller.handleWebhook(
        'conn-id',
        payload,
        undefined,
        sig,
      );

      expect(result).toHaveProperty('data');
      expect(result.data).not.toHaveProperty('webhookSecret');
      expect(result.data).not.toHaveProperty('encryptedSecrets');
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should accept webhook with valid signature', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };
      const body = JSON.stringify(payload);
      const validSignature = computeSignature(body, WEBHOOK_SECRET);

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabled);

      const result = await controller.handleWebhook(
        'conn-id',
        payload,
        undefined,
        validSignature,
      );

      expect(result.data).toHaveProperty('status', 'accepted');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabled);

      await expect(
        controller.handleWebhook(
          'conn-id',
          payload,
          undefined,
          'invalid-hex-signature-value-that-is-wrong',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with missing signature header when secret is configured', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabled);

      await expect(
        controller.handleWebhook('conn-id', payload, undefined, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept webhook without signature when no secret is configured', async () => {
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabledNoSecret);
      mockConfigService.get.mockReturnValue(undefined);

      const result = await controller.handleWebhook(
        'conn-id',
        payload,
        undefined,
        undefined,
      );

      expect(result.data).toHaveProperty('status', 'accepted');
    });

    it('should use global WEBHOOK_SECRET when connection has no secret', async () => {
      const globalSecret = 'global-webhook-secret';
      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: { id: '123', key: 'PROJ-123' },
      };
      const body = JSON.stringify(payload);
      const validSignature = computeSignature(body, globalSecret);

      mockRepository.findOne.mockResolvedValue(mockConnectionEnabledNoSecret);
      mockConfigService.get.mockReturnValue(globalSecret);

      const result = await controller.handleWebhook(
        'conn-id',
        payload,
        undefined,
        validSignature,
      );

      expect(result.data).toHaveProperty('status', 'accepted');
    });

    it('should reject webhook with global secret and missing header', async () => {
      mockRepository.findOne.mockResolvedValue(mockConnectionEnabledNoSecret);
      mockConfigService.get.mockReturnValue('global-secret');      await expect(
        controller.handleWebhook(
          'conn-id',
          { webhookEvent: 'test' },
          undefined,
          undefined,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});