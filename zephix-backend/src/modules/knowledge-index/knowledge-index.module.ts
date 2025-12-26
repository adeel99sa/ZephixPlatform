import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeIndexService } from './services/knowledge-index.service';
import { RagIndex } from './entities/rag-index.entity';
import { AIModule } from '../../ai/ai.module';
import { Task } from '../tasks/entities/task.entity';
import { Risk } from '../risks/entities/risk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RagIndex, Task, Risk]), AIModule],
  controllers: [],
  providers: [KnowledgeIndexService],
  exports: [KnowledgeIndexService],
})
export class KnowledgeIndexModule {}
