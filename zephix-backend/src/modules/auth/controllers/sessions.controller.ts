import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthService } from '../auth.service';
import { formatResponse } from '../../../shared/helpers/response.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthSession } from '../entities/auth-session.entity';

@ApiTags('auth')
@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(@CurrentUser() user: any) {
    const sessions = await this.authSessionRepository.find({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
      },
      order: { lastSeenAt: 'DESC' },
    });

    // Format sessions for response
    const formatted = sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      isRevoked: session.isRevoked(),
      isExpired: session.isExpired(),
      isActive: session.isActive(),
    }));

    return formatResponse(formatted);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(
    @CurrentUser() user: any,
    @Param('id') sessionId: string,
  ) {
    // Security: Filter by userId and organizationId to prevent cross-org access
    const session = await this.authSessionRepository.findOne({
      where: {
        id: sessionId,
        userId: user.id,
        organizationId: user.organizationId,
      },
    });

    if (!session) {
      throw new ForbiddenException('Session not found');
    }

    if (!session.isRevoked()) {
      session.revokedAt = new Date();
      session.revokeReason = 'user_revoked';
      session.currentRefreshTokenHash = null;
      await this.authSessionRepository.save(session);
    }

    return formatResponse({ success: true, sessionId });
  }

  @Post('revoke-others')
  @ApiOperation({ summary: 'Revoke all other sessions (keep current one)' })
  @ApiResponse({
    status: 200,
    description: 'Other sessions revoked successfully',
  })
  async revokeOthers(
    @CurrentUser() user: any,
    @Body() body?: { currentSessionId?: string },
  ) {
    // Get current session ID from body if provided, otherwise use most recent active session
    const providedSessionId = body?.currentSessionId;

    // Find all active sessions for this user, ordered by last seen (most recent first)
    const sessions = await this.authSessionRepository.find({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
        revokedAt: null, // Only active sessions
      },
      order: { lastSeenAt: 'DESC' },
    });

    // If no sessionId provided, use the most recent one as current
    const currentSessionId =
      providedSessionId || (sessions.length > 0 ? sessions[0].id : null);

    // Revoke all except current session
    const sessionsToRevoke = sessions.filter((s) => s.id !== currentSessionId);
    const revokedCount = await Promise.all(
      sessionsToRevoke.map(async (session) => {
        session.revokedAt = new Date();
        session.revokeReason = 'revoke_others';
        session.currentRefreshTokenHash = null;
        await this.authSessionRepository.save(session);
        return 1;
      }),
    );

    return formatResponse({
      success: true,
      revokedCount: revokedCount.length,
    });
  }
}
