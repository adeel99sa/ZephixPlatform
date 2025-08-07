import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIPMAssistantController } from './controllers/ai-pm-assistant.controller';
import { AIPMAssistantService } from './services/ai-pm-assistant.service';
import { PMKnowledgeChunk } from './entities/pm-knowledge-chunk.entity';
import { UserProject } from './entities/user-project.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectRisk } from './entities/project-risk.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Portfolio } from './entities/portfolio.entity';
import { Program } from './entities/program.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PMKnowledgeChunk,
      UserProject,
      ProjectTask,
      ProjectRisk,
      ProjectStakeholder,
      Portfolio,
      Program,
    ]),
  ],
  controllers: [AIPMAssistantController],
  providers: [AIPMAssistantService],
  exports: [AIPMAssistantService],
})
export class PMModule {}
