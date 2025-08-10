#!/usr/bin/env ts-node

import { DataSource, LogLevel } from 'typeorm';
import { Logger } from '@nestjs/common';
import { createDatabaseConfig } from '../src/config/database.config';
import { ConfigService } from '@nestjs/config';
import configuration from '../src/config/configuration';

// Import all entities that exist
import { User } from '../src/users/entities/user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { TeamMember } from '../src/projects/entities/team-member.entity';
import { Role } from '../src/projects/entities/role.entity';
import { Team } from '../src/projects/entities/team.entity';
import { Feedback } from '../src/feedback/entities/feedback.entity';

// PM Entities
import { PMKnowledgeChunk } from '../src/pm/entities/pm-knowledge-chunk.entity';
import { UserProject } from '../src/pm/entities/user-project.entity';
import { ProjectTask } from '../src/pm/entities/project-task.entity';
import { ProjectRisk } from '../src/pm/entities/project-risk.entity';
import { ProjectStakeholder } from '../src/pm/entities/project-stakeholder.entity';
import { Portfolio } from '../src/pm/entities/portfolio.entity';
import { Program } from '../src/pm/entities/program.entity';
import { StatusReport } from '../src/pm/entities/status-report.entity';
import { ProjectMetrics } from '../src/pm/entities/project-metrics.entity';
import { PerformanceBaseline } from '../src/pm/entities/performance-baseline.entity';
import { AlertConfiguration } from '../src/pm/entities/alert-configuration.entity';
import { ManualUpdate } from '../src/pm/entities/manual-update.entity';
import { StakeholderCommunication } from '../src/pm/entities/stakeholder-communication.entity';
import { Risk } from '../src/pm/entities/risk.entity';
import { RiskAssessment } from '../src/pm/entities/risk-assessment.entity';
import { RiskResponse } from '../src/pm/entities/risk-response.entity';
import { RiskMonitoring } from '../src/pm/entities/risk-monitoring.entity';

// Workflow Framework Entities
import { WorkflowTemplate } from '../src/pm/entities/workflow-template.entity';
import { WorkflowInstance } from '../src/pm/entities/workflow-instance.entity';
import { IntakeForm } from '../src/pm/entities/intake-form.entity';
import { IntakeSubmission } from '../src/pm/entities/intake-submission.entity';

// Organization Entities
import { Organization } from '../src/organizations/entities/organization.entity';

// Import migrations with correct class names
import { CreateProjectsTables1704067200000 } from '../src/projects/database/migrations/001_CreateProjectsTables';
import { CreatePMTables1700000000002 } from '../src/pm/database/migrations/002_CreatePMTables';
import { CreateStatusReportingTables1700000000003 } from '../src/pm/database/migrations/003_CreateStatusReportingTables';
import { CreateRiskManagementTables1704000004000 } from '../src/pm/database/migrations/004_CreateRiskManagementTables';
import { CreateWorkflowFramework1704123600000 } from '../src/database/migrations/1704123600000-CreateWorkflowFramework';
import { AddAIGenerationToIntakeForms1735598000000 } from '../src/database/migrations/1735598000000-AddAIGenerationToIntakeForms';

async function runMigrations() {
  const logger = new Logger('Migration');
  
  try {
    // Create a mock config service with the configuration
    const config = configuration();
    const mockConfigService = {
      get: (path: string) => {
        const keys = path.split('.');
        let value: any = config;
        for (const key of keys) {
          value = value?.[key];
        }
        return value;
      },
    } as ConfigService;

    // Create database config
    const dbConfig = createDatabaseConfig(mockConfigService);
    
    // Add entities and migrations to the config
    const dataSourceConfig = {
      ...dbConfig,
      // Simplify logging to avoid type issues
      logging: false,
      logger: undefined,
      entities: [
        User, Project, TeamMember, Role, Team, Feedback, Organization,
        PMKnowledgeChunk, UserProject, ProjectTask, ProjectRisk, ProjectStakeholder,
        Portfolio, Program, StatusReport, ProjectMetrics, PerformanceBaseline,
        AlertConfiguration, ManualUpdate, StakeholderCommunication,
        Risk, RiskAssessment, RiskResponse, RiskMonitoring,
        WorkflowTemplate, WorkflowInstance, IntakeForm, IntakeSubmission,
      ],
      migrations: [
        CreateProjectsTables1704067200000,
        CreatePMTables1700000000002,
        CreateStatusReportingTables1700000000003,
        CreateRiskManagementTables1704000004000,
        CreateWorkflowFramework1704123600000,
        AddAIGenerationToIntakeForms1735598000000,
      ],
      migrationsRun: false, // We'll run them manually
    };

    logger.log('🔗 Connecting to database...');
    const dataSource = new DataSource(dataSourceConfig);
    await dataSource.initialize();

    logger.log('🔄 Running pending migrations...');
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length > 0) {
      logger.log(`✅ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        logger.log(`   - ${migration.name}`);
      });
    } else {
      logger.log('✅ No pending migrations found');
    }

    await dataSource.destroy();
    logger.log('🔌 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
