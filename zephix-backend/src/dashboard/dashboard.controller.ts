import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req): Promise<DashboardResponseDto> {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    return this.dashboardService.getDashboardData(userId, organizationId);
  }

  @Get('recent')
  async getRecentActivity(
    @Req() req,
    @Query('organizationId') organizationId: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.user.id;
    const orgId = organizationId || req.user.organizationId;
    const limitNum = limit ? parseInt(limit, 10) : 6;
    
    return this.dashboardService.getRecentActivity(userId, orgId, limitNum);
  }

  @Get('action-items')
  async getActionItems(
    @Req() req,
    @Query('organizationId') organizationId: string
  ) {
    const userId = req.user.id;
    const orgId = organizationId || req.user.organizationId;
    
    return this.dashboardService.getActionItems(userId, orgId);
  }

  @Get('stats')
  async getStats(
    @Req() req,
    @Query('organizationId') organizationId: string
  ) {
    const userId = req.user.id;
    const orgId = organizationId || req.user.organizationId;
    
    return this.dashboardService.getStats(userId, orgId);
  }

  @Get('test')
  async test() {
    return { message: "Dashboard test endpoint working", timestamp: new Date() };
  }
}
