import { Module } from '@nestjs/common';

import { DemoRequestController } from './demo-request.controller';
import { DemoRequestService } from './demo-request.service';

@Module({
  controllers: [DemoRequestController],
  providers: [DemoRequestService],
})
export class DemoRequestsModule {}
