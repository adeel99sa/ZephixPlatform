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
  @ApiResponse({ status: 403, description: 'Invalid smoke key' })
  @ApiResponse({ status: 404, description: 'Not found (returned when not in staging to hide route existence)' })
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

    // Query auth_outbox for most recent invite event for this email.
    // Uses manager.query() with parameterized raw SQL to reliably access JSONB fields.
    const rows = await this.authOutboxRepository.manager.query<{ token: string }[]>(
      `SELECT payload_json->>'token' AS token
       FROM auth_outbox
       WHERE type = $1
         AND payload_json->>'email' = $2
         AND payload_json->>'token' IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [INVITE_EVENT_TYPE, normalized],
    );
    const row = rows[0] ?? null;

    if (!row || !row.token) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invite token not found',
      });
    }

    return { token: row.token };
  }
}
