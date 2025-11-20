import { Module, forwardRef } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ProjectsModule } from '../modules/projects/projects.module';
import { RisksModule } from '../modules/risks/risks.module';

@Module({
  imports: [
    forwardRef(() => ProjectsModule),
    forwardRef(() => RisksModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {
  constructor() {
    console.log('DashboardModule loaded');
  }
}
