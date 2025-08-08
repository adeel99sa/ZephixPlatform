import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIPMAssistantController } from './controllers/ai-pm-assistant.controller';
import { AIIntelligenceController } from './controllers/ai-intelligence.controller';
import { AIChatController } from './controllers/ai-chat.controller';
import { AIPMAssistantService } from './services/ai-pm-assistant.service';
import { ZephixAIIntelligenceService } from './services/zephix-ai-intelligence.service';
import { AIChatService } from './services/ai-chat.service';
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
  controllers: [AIPMAssistantController, AIIntelligenceController, AIChatController],
  providers: [AIPMAssistantService, ZephixAIIntelligenceService, AIChatService],
  exports: [AIPMAssistantService, ZephixAIIntelligenceService, AIChatService],
})
export class PMModule {}
