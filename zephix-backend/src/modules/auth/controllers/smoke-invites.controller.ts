import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SmokeKeyGuard } from '../guards/smoke-key.guard';
import { AuthOutbox } from '../entities/auth-outbox.entity';

const INVITE_EVENT_TYPE = 'auth.invite.created';

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

@ApiTags('smoke')
@Controller('smoke/invites')
@UseGuards(SmokeKeyGuard)
export class SmokeInvitesController {
  constructor(
    @InjectRepository(AuthOutbox)
    private readonly authOutboxRepository: Repository<AuthOutbox>,
  ) {}

  /**
   * GET /api/smoke/invites/latest-token?email=...
   *
   * Staging-only endpoint. Returns the raw invite token for the given
   * invitee email from the auth_outbox. Token is ONLY for smoke test use.
   *
   * - Requires X-Smoke-Key header (SmokeKeyGuard enforces NODE_ENV=staging + ZEPHIX_ENV=staging)
   * - Email must be @zephix.dev domain
   * - Returns { token } only — no other outbox fields
   */
  @Get('latest-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staging-only: retrieve latest org invite token for smoke email' })
  @ApiResponse({ status: 200, description: 'Token returned' })
  @ApiResponse({ status: 400, description: 'Missing or invalid email' })
  @ApiResponse({ status: 403, description: 'Invalid smoke key or not staging' })
  @ApiResponse({ status: 404, description: 'No invite token found for email' })
  async getLatestToken(
    @Query('email') email: string | undefined,
  ): Promise<{ token: string }> {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestException({
        code: 'MISSING_EMAIL',
        message: 'email query parameter is required',
      });
    }

    const normalized = normalizeEmail(email);

    if (!normalized.endsWith('@zephix.dev')) {
      throw new BadRequestException({
        code: 'INVALID_EMAIL_DOMAIN',
        message: 'email must be a @zephix.dev address',
      });
    }

    // Query auth_outbox for most recent invite event for this email
    // Uses JSONB field access to match on payloadJson.email and extract payloadJson.token
    const row = await this.authOutboxRepository
      .createQueryBuilder('outbox')
      .select(`outbox.payload_json->>'token'`, 'token')
      .where('outbox.type = :type', { type: INVITE_EVENT_TYPE })
      .andWhere(`outbox.payload_json->>'email' = :email`, { email: normalized })
      .andWhere(`outbox.payload_json->>'token' IS NOT NULL`)
      .orderBy('outbox.created_at', 'DESC')
      .limit(1)
      .getRawOne<{ token: string }>();

    if (!row || !row.token) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invite token not found',
      });
    }

    return { token: row.token };
  }
}
