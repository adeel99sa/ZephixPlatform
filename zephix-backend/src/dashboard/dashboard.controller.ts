import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { AuthRequest } from '../common/http/auth-request';
import { getAuthContext } from '../common/http/get-auth-context';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(
    @Request() req: AuthRequest,
  ): Promise<DashboardResponseDto> {
    const { userId, organizationId } = getAuthContext(req);

    return this.dashboardService.getDashboardData(userId, organizationId);
  }
}
