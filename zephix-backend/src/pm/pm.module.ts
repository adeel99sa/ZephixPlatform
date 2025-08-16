import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIPMAssistantController } from './controllers/ai-pm-assistant.controller';
import { AIIntelligenceController } from './controllers/ai-intelligence.controller';
import { AIChatController } from './controllers/ai-chat.controller';
import { DocumentIntelligenceController } from './controllers/document-intelligence.controller';
import { IntakeDesignerController } from './controllers/intake-designer.controller';

// Workflow Framework Controllers
import {
  WorkflowTemplateController,
  WorkflowInstanceController,
} from './controllers/workflow-template.controller';
import {
  IntakeFormController,
  PublicIntakeController,
} from './controllers/intake-form.controller';

import { AIPMAssistantService } from './services/ai-pm-assistant.service';
import { ZephixAIIntelligenceService } from './services/zephix-ai-intelligence.service';
import { AIChatService } from './services/ai-chat.service';
import { ZephixIntelligentDocumentProcessor } from './services/document-intelligence.service';
import { AIFormGeneratorService } from './services/ai-form-generator.service';

// Workflow Framework Services
import { WorkflowTemplateService } from './services/workflow-template.service';
import { IntakeFormService } from './services/intake-form.service';
import { IntegrationService } from './services/integration.service';
import { ProjectInitiationModule } from './project-initiation/project-initiation.module';
import { RiskManagementModule } from './risk-management/risk-management.module';
import { StatusReportingModule } from './status-reporting/status-reporting.module';
// AccessControlModule removed - using built-in NestJS guards instead
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
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { JiraIntegration } from './integrations/jira.integration';
import { GitHubIntegration } from './integrations/github.integration';
import { TeamsIntegration } from './integrations/teams.integration';
import { FinancialIntegration } from './integrations/financial.integration';
import { AIModule } from '../ai/ai.module';
import { ProjectMetrics } from './entities/project-metrics.entity';
import { PerformanceBaseline } from './entities/performance-baseline.entity';
import { ManualUpdate } from './entities/manual-update.entity';
import { StakeholderCommunication } from './entities/stakeholder-communication.entity';
import { AlertConfiguration } from './entities/alert-configuration.entity';

@Module({
  imports: [
    AIModule, // Always import AIModule for LLMProviderService and ClaudeService
    // Only import database-dependent sub-modules when database is available AND connection is stable
    ...(process.env.DATABASE_URL ? (() => {
      try {
        console.log('🔍 PMModule: Loading database-dependent sub-modules...');
        return [
          ProjectInitiationModule,
          RiskManagementModule,
          StatusReportingModule,
          TypeOrmModule.forFeature([
            // Use actual entities that exist
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
            UserOrganization,
            // Workflow Framework Entities
            WorkflowTemplate,
            WorkflowInstance,
            IntakeForm,
            IntakeSubmission,
            ProjectMetrics,
            PerformanceBaseline,
            ManualUpdate,
            StakeholderCommunication,
            AlertConfiguration,
          ]),
        ];
      } catch (error) {
        console.error('❌ PMModule: TypeORM loading failed:', error);
        console.warn('⚠️  PMModule: Continuing without database entities');
        return [];
      }
    })() : []),
  ],
  controllers: [
    // Existing controllers
    WorkflowTemplateController,
    WorkflowInstanceController,
    IntakeFormController,
    IntakeDesignerController,
    DocumentIntelligenceController,
    AIPMAssistantController,
    AIIntelligenceController,
    AIChatController,
    PublicIntakeController,
  ],
  providers: [
    // Existing providers
    WorkflowTemplateService,
    IntakeFormService,
    IntegrationService,
    AIPMAssistantService,
    ZephixAIIntelligenceService,
    AIChatService,
    ZephixIntelligentDocumentProcessor,
    AIFormGeneratorService,
  ],
  exports: [
    // Existing exports
    WorkflowTemplateService,
    IntakeFormService,
    IntegrationService,
    AIPMAssistantService,
    ZephixAIIntelligenceService,
    AIChatService,
    ZephixIntelligentDocumentProcessor,
    AIFormGeneratorService,
  ],
})
export class PMModule {
  constructor() {
    try {
      console.log('🔍 PMModule constructor executing');
      console.log('🔍 PMModule controllers count:', 9); // Number of actual controllers
      console.log('🔍 PMModule providers count:', 8); // Number of actual providers
      console.log('✅ PMModule constructor completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in PMModule constructor:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
