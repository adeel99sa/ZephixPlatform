import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { MaterializedProjectMetrics } from './entities/materialized-project-metrics.entity';
import { MaterializedResourceMetrics } from './entities/materialized-resource-metrics.entity';
import { MaterializedPortfolioMetrics } from './entities/materialized-portfolio-metrics.entity';
import { ObservabilityModule } from '../../observability/observability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterializedProjectMetrics,
      MaterializedResourceMetrics,
      MaterializedPortfolioMetrics,
    ]),
    ObservabilityModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
