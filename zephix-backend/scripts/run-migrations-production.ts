#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';

// Load environment variables
config();

// Import all entities
import { User } from '../src/users/entities/user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { TeamMember } from '../src/projects/entities/team-member.entity';
import { Role } from '../src/projects/entities/role.entity';
import { Team } from '../src/projects/entities/team.entity';
import { Feedback } from '../src/feedback/entities/feedback.entity';
import { PMKnowledgeChunk } from '../src/pm/entities/pm-knowledge-chunk.entity';
import { UserProject } from '../src/pm/entities/user-project.entity';
import { ProjectTask } from '../src/pm/entities/project-task.entity';
import { ProjectRisk } from '../src/pm/entities/project-risk.entity';
import { ProjectStakeholder } from '../src/pm/entities/project-stakeholder.entity';
import { Portfolio } from '../src/pm/entities/portfolio.entity';
import { Program } from '../src/pm/entities/program.entity';
import { StatusReport } from '../src/pm/status-reporting/entities/status-report.entity';
import { ProjectMetrics } from '../src/pm/entities/project-metrics.entity';
import { PerformanceBaseline } from '../src/pm/entities/performance-baseline.entity';
import { AlertConfiguration } from '../src/pm/entities/alert-configuration.entity';
import { ManualUpdate } from '../src/pm/entities/manual-update.entity';
import { StakeholderCommunication } from '../src/pm/entities/stakeholder-communication.entity';
import { Risk } from '../src/pm/entities/risk.entity';
import { RiskAssessment } from '../src/pm/entities/risk-assessment.entity';
import { RiskResponse } from '../src/pm/entities/risk-response.entity';
import { RiskMonitoring } from '../src/pm/entities/risk-monitoring.entity';
import { BRD } from '../src/brd/entities/brd.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';

// Production-ready migration runner
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User, Feedback, Project, Team, TeamMember, Role, PMKnowledgeChunk, 
    UserProject, ProjectTask, ProjectRisk, ProjectStakeholder, Portfolio, 
    Program, StatusReport, ProjectMetrics, PerformanceBaseline, 
    AlertConfiguration, ManualUpdate, StakeholderCommunication, Risk, 
    RiskAssessment, RiskResponse, RiskMonitoring, BRD, Organization, 
    UserOrganization
  ],
  migrations: [__dirname + '/../**/migrations/*{.ts,.js}'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 5, // Reduced pool for migration safety
    min: 1,
    acquire: 30000,
    idle: 10000,
    family: 4, // Force IPv4
  },
  logging: ['error', 'warn', 'migration'],
});

async function runMigrations() {
  const logger = new Logger('Migration');
  
  try {
    logger.log('🔗 Connecting to database for migration...');
    logger.log(`📊 Environment: ${process.env.NODE_ENV}`);
    logger.log(`🔗 Database URL configured: ${!!process.env.DATABASE_URL}`);
    
    await dataSource.initialize();
    logger.log('✅ Database connection established');
    
    logger.log('📋 Checking pending migrations...');
    const pendingMigrations = await dataSource.showMigrations();
    
    if (pendingMigrations) {
      logger.log('🔄 Running pending migrations...');
      const migrations = await dataSource.runMigrations();
      
      if (migrations.length > 0) {
        logger.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach(migration => {
          logger.log(`  ✓ ${migration.name}`);
        });
      } else {
        logger.log('✅ No pending migrations found');
      }
    } else {
      logger.log('✅ Database schema is up to date');
    }
    
    // Verify essential tables exist
    logger.log('🔍 Verifying essential tables...');
    const tables = ['users', 'organizations', 'projects', 'user_organizations'];
    
    for (const table of tables) {
      try {
        await dataSource.query(`SELECT 1 FROM ${table} LIMIT 1`);
        logger.log(`  ✓ Table '${table}' exists and accessible`);
      } catch (error) {
        logger.warn(`  ⚠️  Table '${table}' may not exist or accessible: ${error.message}`);
      }
    }
    
    await dataSource.destroy();
    logger.log('🔌 Database connection closed');
    logger.log('🎉 Migration process completed successfully');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error.message);
    logger.error('Stack trace:', error.stack);
    
    // Attempt to close connection on error
    try {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch (closeError) {
      logger.error('Failed to close database connection:', closeError.message);
    }
    
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
