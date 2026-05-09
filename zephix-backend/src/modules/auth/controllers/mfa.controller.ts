import {
  Controller,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditGuardDecision } from '../../../common/audit/audit-guard-decision.decorator';
import { MfaService } from '../services/mfa.service';
import { VerifyMfaDto } from '../dto/verify-mfa.dto';
import { DisableMfaDto } from '../dto/disable-mfa.dto';
import { User } from '../../users/entities/user.entity';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

/**
 * Opt-in MFA endpoints (ADR-009b — mandatory enforcement deferred to Phase 1B).
 *
 * Routes (all under global `/api` prefix; rewrite middleware exposes the same
 * paths under `/api/v1` automatically per main.ts:79-86):
 *
 *  - POST   /auth/mfa/enroll  — generate fresh secret, store ciphertext, return QR
 *  - POST   /auth/mfa/verify  — confirm a TOTP code, flip mfa_enabled = true
 *  - DELETE /auth/mfa         — disable MFA (requires password re-confirm)
 *
 * No MFA challenge dispatch on login is wired in MVP — users who have enrolled
 * supply `twoFactorCode` on the existing `LoginDto` if/when AuthService.login()
 * decides to require it (currently a no-op pass-through). Re-introducing
 * mandatory MFA reuses `MfaService.isAdminBlockedByMfaPolicy()` which is
 * already shipped in PR1; only guard wiring + login-flow dispatch are missing.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3.2, ADR-009b.
 */
@ApiTags('Auth — MFA')
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('enroll')
  @HttpCode(HttpStatus.OK)
  @AuditGuardDecision({
    action: 'config',
    scope: 'global',
    requiredRole: 'authenticated',
  })
  @ApiOperation({ summary: 'Generate a fresh TOTP secret + QR for MFA enrollment' })
  async enroll(@Request() req: AuthRequest) {
    const { userId } = getAuthContext(req);
    return this.mfaService.enroll(userId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @AuditGuardDecision({
    action: 'config',
    scope: 'global',
    requiredRole: 'authenticated',
  })
  @ApiOperation({ summary: 'Verify a TOTP code and enable MFA on the account' })
  async verify(@Request() req: AuthRequest, @Body() dto: VerifyMfaDto) {
    const { userId } = getAuthContext(req);
    return this.mfaService.verify(userId, dto.code);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @AuditGuardDecision({
    action: 'config',
    scope: 'global',
    requiredRole: 'authenticated',
  })
  @ApiOperation({ summary: 'Disable MFA (requires current password re-confirm)' })
  async disable(@Request() req: AuthRequest, @Body() dto: DisableMfaDto) {
    const { userId } = getAuthContext(req);

    // Password re-confirm — guards against a stolen access token disabling MFA.
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    return this.mfaService.disable(userId);
  }
}
