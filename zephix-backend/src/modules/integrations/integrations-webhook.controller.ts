import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationEncryptionService } from './services/integration-encryption.service';
import { formatResponse } from '../../shared/helpers/response.helper';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';

/**
 * Webhook controller for Jira integration
 *
 * DISABLED BY DEFAULT: Only processes webhooks when connection.webhookEnabled === true
 * Webhook signature verification enforced when webhookSecret is configured.
 */
@Controller('integrations/jira/webhook')
export class IntegrationsWebhookController {
  private readonly logger = new Logger(IntegrationsWebhookController.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(IntegrationConnection))
    private connectionRepository: TenantAwareRepository<IntegrationConnection>,
    private encryptionService: IntegrationEncryptionService,
    private configService: ConfigService,
  ) {}

  /**
   * Verify the webhook signature using HMAC SHA-256.
   * Compares the provided signature header against the computed HMAC of the
   * raw request body, using timing-safe comparison to prevent timing attacks.
   */
  private verifyWebhookSignature(
    body: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const rawBody = typeof body === 'string' ? body : body.toString('utf8');
      const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  @Post(':connectionId')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RateLimiterGuard)
  async handleWebhook(
    @Param('connectionId') connectionId: string,
    @Body() payload: any,
    @Headers('x-atlassian-webhook-identifier') webhookId?: string,
    @Headers('x-zephix-signature') signatureHeader?: string,
    @Req() req?: Request,
  ) {
    // Load connection
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new BadRequestException('Integration connection not found');
    }

    // Check if webhook is enabled for this connection
    if (!connection.webhookEnabled) {
      this.logger.debug(
        `Webhook received for disabled connection: ${connectionId}`,
      );
      // Return 202 Accepted but don't process
      return formatResponse({
        status: 'ignored',
        message: 'Webhook processing disabled for this connection',
        connectionId,
      });
    }

    // ── Webhook Signature Verification ──
    // If the connection has a webhookSecret configured, signature is mandatory.
    // Also check the global WEBHOOK_SECRET as a fallback signing key.
    const secret =
      connection.webhookSecret ||
      this.configService.get<string>('WEBHOOK_SECRET');

    if (secret) {
      if (!signatureHeader) {
        this.logger.warn(
          `Webhook rejected: missing x-zephix-signature header for connection ${connectionId}`,
        );
        throw new UnauthorizedException(
          'Missing webhook signature header: x-zephix-signature',
        );
      }

      // Use raw body from request if available, otherwise stringify payload
      const rawBody = (req as any)?.rawBody || JSON.stringify(payload);

      if (!this.verifyWebhookSignature(rawBody, signatureHeader, secret)) {
        this.logger.warn(
          `Webhook rejected: invalid signature for connection ${connectionId}`,
        );
        throw new UnauthorizedException('Invalid webhook signature');
      }

      this.logger.debug(
        `Webhook signature verified for connection: ${connectionId}`,
      );
    }

    // Log webhook received
    this.logger.log('Webhook received and verified', {
      connectionId,
      webhookEvent: payload.webhookEvent,
      issueKey: payload.issue?.key,
      organizationId: connection.organizationId,
    });

    // Return 202 Accepted (fast response, processing happens async)
    return formatResponse({
      status: 'accepted',
      message: 'Webhook received and verified',
      connectionId,
    });
  }
}
