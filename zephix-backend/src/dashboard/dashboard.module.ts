import { Module, forwardRef } from '@nestjs/common';
import { bootLog } from '../common/utils/debug-boot';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ProjectsModule } from '../modules/projects/projects.module';
import { RiskManagementModule } from '../pm/risk-management/risk-management.module';

@Module({
  imports: [
    forwardRef(() => ProjectsModule),
    forwardRef(() => RiskManagementModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {
  constructor() {
    bootLog('DashboardModule loaded');
  }
}
