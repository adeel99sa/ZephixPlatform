import { Module, Global } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { LoggerService } from './logger.service';
import { TelemetryService } from './telemetry.service';
import { pinoConfig } from './logger.config';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot(pinoConfig),
  ],
  providers: [MetricsService, LoggerService, TelemetryService],
  controllers: [MetricsController],
  exports: [MetricsService, LoggerService, TelemetryService, LoggerModule],
})
export class ObservabilityModule {}