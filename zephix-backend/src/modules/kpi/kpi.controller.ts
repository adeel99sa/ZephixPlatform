import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KPIService } from './kpi.service';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@Controller('kpi')
@UseGuards(JwtAuthGuard)
export class KPIController {
  constructor(private readonly kpiService: KPIService) {}

  @Get('project/:id')
  async getProjectKPIs(@Param('id') id: string) {
    return this.kpiService.calculateProjectKPIs(id);
  }

  @Get('portfolio')
  async getPortfolioKPIs(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.kpiService.calculatePortfolioKPIs(organizationId);
  }
}
