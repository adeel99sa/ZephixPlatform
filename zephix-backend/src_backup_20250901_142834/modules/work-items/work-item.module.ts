import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkItem } from './entities/work-item.entity';
import { WorkItemService } from './work-item.service';
import { WorkItemController } from './work-item.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkItem])],
  providers: [WorkItemService],
  controllers: [WorkItemController],
  exports: [WorkItemService],
})
export class WorkItemModule {}
