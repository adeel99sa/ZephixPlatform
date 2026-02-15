import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequestEntity } from './entities/change-request.entity';
import { ChangeRequestsService } from './services/change-requests.service';
import { ChangeRequestsController } from './controllers/change-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChangeRequestEntity])],
  providers: [ChangeRequestsService],
  controllers: [ChangeRequestsController],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
