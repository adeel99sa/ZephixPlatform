import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthQueuesController } from './health-queues.controller';
import { User } from "../modules/users/entities/user.entity"

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [HealthController, HealthQueuesController],
  exports: [],
})
export class HealthModule {}
