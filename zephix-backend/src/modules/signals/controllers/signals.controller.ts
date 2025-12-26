import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { SignalsService } from '../services/signals.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

/**
 * Phase 8: Signals Controller
 * Provides endpoints for accessing signals reports
 */
@Controller('signals')
@UseGuards(JwtAuthGuard)
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('report/latest')
  async getLatestReport(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return await this.signalsService.getLatestReport(organizationId);
  }
}
