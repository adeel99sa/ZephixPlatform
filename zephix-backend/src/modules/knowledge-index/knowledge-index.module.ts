import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeIndexService } from './services/knowledge-index.service';
import { RagIndex } from './entities/rag-index.entity';
import { AIModule } from '../../ai/ai.module';
import { Task } from '../tasks/entities/task.entity';
import { WorkRisk } from '../work-management/entities/work-risk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RagIndex, Task, WorkRisk]), AIModule],
  controllers: [],
  providers: [KnowledgeIndexService],
  exports: [KnowledgeIndexService],
})
export class KnowledgeIndexModule {}
