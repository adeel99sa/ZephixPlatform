import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIPMAssistantController } from './controllers/ai-pm-assistant.controller';
import { AIIntelligenceController } from './controllers/ai-intelligence.controller';
import { AIChatController } from './controllers/ai-chat.controller';
import { DocumentIntelligenceController } from './controllers/document-intelligence.controller';

// Workflow Framework Controllers
import { WorkflowTemplateController, WorkflowInstanceController } from './controllers/workflow-template.controller';
import { IntakeFormController, PublicIntakeController } from './controllers/intake-form.controller';

import { AIPMAssistantService } from './services/ai-pm-assistant.service';
import { ZephixAIIntelligenceService } from './services/zephix-ai-intelligence.service';
import { AIChatService } from './services/ai-chat.service';
import { ZephixIntelligentDocumentProcessor } from './services/document-intelligence.service';

// Workflow Framework Services
import { WorkflowTemplateService } from './services/workflow-template.service';
import { IntakeFormService } from './services/intake-form.service';
import { IntegrationService } from './services/integration.service';
import { ProjectInitiationModule } from './project-initiation/project-initiation.module';
import { RiskManagementModule } from './risk-management/risk-management.module';
import { StatusReportingModule } from './status-reporting/status-reporting.module';
import { SharedModule } from '../shared/shared.module';
import { PMKnowledgeChunk } from './entities/pm-knowledge-chunk.entity';
import { UserProject } from './entities/user-project.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectRisk } from './entities/project-risk.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Portfolio } from './entities/portfolio.entity';
import { Program } from './entities/program.entity';

import { Risk } from './entities/risk.entity';
import { RiskAssessment } from './entities/risk-assessment.entity';
import { RiskResponse } from './entities/risk-response.entity';
import { RiskMonitoring } from './entities/risk-monitoring.entity';

// Workflow Framework Entities
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { IntakeForm } from './entities/intake-form.entity';
import { IntakeSubmission } from './entities/intake-submission.entity';
import { Project } from '../projects/entities/project.entity';
import { TeamMember } from '../projects/entities/team-member.entity';
import { JiraIntegration } from './integrations/jira.integration';
import { GitHubIntegration } from './integrations/github.integration';
import { TeamsIntegration } from './integrations/teams.integration';
import { FinancialIntegration } from './integrations/financial.integration';

@Module({
  imports: [
    ProjectInitiationModule,
    RiskManagementModule,
    StatusReportingModule,
    SharedModule,
    TypeOrmModule.forFeature([
      PMKnowledgeChunk,
      UserProject,
      ProjectTask,
      ProjectRisk,
      ProjectStakeholder,
      Portfolio,
      Program,
      Risk,
      RiskAssessment,
      RiskResponse,
      RiskMonitoring,
      Project,
      TeamMember,
      // Workflow Framework Entities
      WorkflowTemplate,
      WorkflowInstance,
      IntakeForm,
      IntakeSubmission,
    ]),
  ],
  controllers: [
    AIPMAssistantController, 
    AIIntelligenceController, 
    AIChatController,
    DocumentIntelligenceController,
    // Workflow Framework Controllers
    WorkflowTemplateController,
    WorkflowInstanceController,
    IntakeFormController,
    PublicIntakeController,
  ],
  providers: [
    AIPMAssistantService, 
    ZephixAIIntelligenceService, 
    AIChatService,
    ZephixIntelligentDocumentProcessor,
    JiraIntegration,
    GitHubIntegration,
    TeamsIntegration,
    FinancialIntegration,
    // Workflow Framework Services
    WorkflowTemplateService,
    IntakeFormService,
    IntegrationService,
  ],
  exports: [
    AIPMAssistantService, 
    ZephixAIIntelligenceService, 
    AIChatService,
    ZephixIntelligentDocumentProcessor,
    // Workflow Framework Services
    WorkflowTemplateService,
    IntakeFormService,
    IntegrationService,
  ],
})
export class PMModule {}
