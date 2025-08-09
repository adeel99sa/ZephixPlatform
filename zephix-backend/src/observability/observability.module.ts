import { Module, Global } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { pinoConfig } from './logger.config';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot(pinoConfig),
  ],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService, LoggerModule],
})
export class ObservabilityModule {}