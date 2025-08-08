import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIPMAssistantController } from './controllers/ai-pm-assistant.controller';
import { AIIntelligenceController } from './controllers/ai-intelligence.controller';
import { AIChatController } from './controllers/ai-chat.controller';
import { DocumentIntelligenceController } from './controllers/document-intelligence.controller';
import { StatusReportingController } from './controllers/status-reporting.controller';
import { AIPMAssistantService } from './services/ai-pm-assistant.service';
import { ZephixAIIntelligenceService } from './services/zephix-ai-intelligence.service';
import { AIChatService } from './services/ai-chat.service';
import { ZephixIntelligentDocumentProcessor } from './services/document-intelligence.service';
import { StatusReportingService } from './services/status-reporting.service';
import { ProjectInitiationModule } from './project-initiation/project-initiation.module';
import { RiskManagementModule } from './risk-management/risk-management.module';
import { PMKnowledgeChunk } from './entities/pm-knowledge-chunk.entity';
import { UserProject } from './entities/user-project.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectRisk } from './entities/project-risk.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Portfolio } from './entities/portfolio.entity';
import { Program } from './entities/program.entity';
import { StatusReport } from './entities/status-report.entity';
import { ProjectMetrics } from './entities/project-metrics.entity';
import { PerformanceBaseline } from './entities/performance-baseline.entity';
import { AlertConfiguration } from './entities/alert-configuration.entity';
import { ManualUpdate } from './entities/manual-update.entity';
import { StakeholderCommunication } from './entities/stakeholder-communication.entity';
import { Risk } from './entities/risk.entity';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskResponse } from './entities/risk-response.entity';
import { RiskMonitoring } from './entities/risk-monitoring.entity';
import { Project } from '../projects/entities/project.entity';
import { TeamMember } from '../projects/entities/team-member.entity';
import { ClaudeService } from '../ai/claude.service';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { JiraIntegration } from './integrations/jira.integration';
import { GitHubIntegration } from './integrations/github.integration';
import { TeamsIntegration } from './integrations/teams.integration';
import { FinancialIntegration } from './integrations/financial.integration';

@Module({
  imports: [
    ProjectInitiationModule,
    RiskManagementModule,
    TypeOrmModule.forFeature([
      PMKnowledgeChunk,
      UserProject,
      ProjectTask,
      ProjectRisk,
      ProjectStakeholder,
      Portfolio,
      Program,
      StatusReport,
      ProjectMetrics,
      PerformanceBaseline,
      AlertConfiguration,
      ManualUpdate,
      StakeholderCommunication,
      Risk,
      RiskAssessment,
      RiskResponse,
      RiskMonitoring,
      Project,
      TeamMember,
    ]),
  ],
  controllers: [
    AIPMAssistantController, 
    AIIntelligenceController, 
    AIChatController,
    DocumentIntelligenceController,
    StatusReportingController,
  ],
  providers: [
    AIPMAssistantService, 
    ZephixAIIntelligenceService, 
    AIChatService,
    ZephixIntelligentDocumentProcessor,
    // StatusReportingService, // <-- Comment this out temporarily
    ClaudeService,
    ProjectPermissionGuard,
    JiraIntegration,
    GitHubIntegration,
    TeamsIntegration,
    FinancialIntegration,
  ],
  exports: [
    AIPMAssistantService, 
    ZephixAIIntelligenceService, 
    AIChatService,
    ZephixIntelligentDocumentProcessor,
    StatusReportingService,
  ],
})
export class PMModule {}
