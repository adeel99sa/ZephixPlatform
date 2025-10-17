import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KPIService } from '../services/kpi.service';

@UseGuards(AuthGuard('jwt'))
@Controller('kpi')
export class KPIController {
  private readonly logger = new Logger(KPIController.name);
  constructor(private readonly svc: KPIService) {}

  @Get('portfolio')
  async portfolio() {
    try {
      const data = await this.svc.getPortfolioKPIs();
      return { success: true, data };
    } catch (err: any) {
      this.logger.error('kpi/portfolio failed', err?.stack ?? String(err));
      // Never 500 for reads: provide safe default payload
      return {
        success: true,
        data: {
          totalProjects: 0,
          activeProjects: 0,
          resourceUtilization: 0,
          budgetVariance: 0,
          conflictsPrevented: 0,
        },
        note: 'fallback',
      };
    }
  }
}
