import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('portfolio')
  async getPortfolioMetrics(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.analyticsService.getPmoMaturityScore(organizationId);
  }
}
