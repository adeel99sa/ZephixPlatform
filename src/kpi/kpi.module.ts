import { Module } from '@nestjs/common';
import { KPIController } from './controllers/kpi.controller';
import { KPIService } from './services/kpi.service';

@Module({
  controllers: [KPIController],
  providers: [KPIService],
})
export class KPIModule {}
