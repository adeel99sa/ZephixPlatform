import { Module } from '@nestjs/common';
import { DbProbeController } from './db.probe.controller';

@Module({
  controllers: [DbProbeController],
})
export class ObservabilityModule {}
