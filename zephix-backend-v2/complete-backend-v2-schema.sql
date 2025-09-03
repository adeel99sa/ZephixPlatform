-- COMPLETE SCHEMA BASED ON ENTITY ANALYSIS
-- This matches EXACTLY what the entities expect

BEGIN;

-- Clean existing tables
DROP TABLE IF EXISTS ai_interactions CASCADE;
DROP TABLE IF EXISTS ai_token_usage CASCADE;
DROP TABLE IF EXISTS organization_mandatory_kpis CASCADE;
DROP TABLE IF EXISTS kpi_definitions CASCADE;
DROP TABLE IF EXISTS template_phases CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS resource_conflicts CASCADE;
DROP TABLE IF EXISTS resource_allocations CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Organizations (from organization.entity.ts)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) UNIQUE,
  plan_type VARCHAR(50) DEFAULT 'trial',
  subscription_id VARCHAR(255),
  billing_email VARCHAR(255),
  max_users INTEGER,
  max_projects INTEGER,
  trial_ends_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (from user.entity.ts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  organization_id UUID,
  profile_picture VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  "resetToken" VARCHAR(255),
  "resetTokenExpiry" TIMESTAMP,
  "verificationToken" VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Organizations (from user-organization.entity.ts)
CREATE TABLE user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  joined_at DATE,
  left_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens (from refresh-token.entity.ts)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "isRevoked" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios (from portfolio.entity.ts)
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  owner_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Programs (from program.entity.ts)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates (from template.entity.ts)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  methodology VARCHAR(50) DEFAULT 'agile',
  description TEXT,
  structure JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT true,
  organization_id UUID,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Phases (from template-phase.entity.ts)
CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL,
  gate_requirements JSONB DEFAULT '[]',
  duration_days INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (from project.entity.ts)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning',
  priority VARCHAR(50) DEFAULT 'medium',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  estimated_end_date TIMESTAMP,
  organization_id UUID NOT NULL,
  program_id UUID,
  project_manager_id UUID,
  budget DECIMAL(10,2),
  template VARCHAR(50),
  template_id UUID,
  methodology VARCHAR(50),
  department VARCHAR(100),
  stakeholders TEXT[],
  actual_cost DECIMAL(10,2),
  risk_level VARCHAR(50) DEFAULT 'medium',
  created_by_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (from task.entity.ts)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID NOT NULL,
  assigned_to UUID,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  dependencies JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Allocations (from resource-allocation.entity.ts)
CREATE TABLE resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "taskId" UUID,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "allocationPercentage" NUMERIC(5,2) NOT NULL,
  "hoursPerDay" INTEGER DEFAULT 8,
  organization_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Resource Conflicts (from resource-conflict.entity.ts)
CREATE TABLE resource_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  conflict_date DATE NOT NULL,
  total_allocation DECIMAL(5,2) NOT NULL,
  conflicting_projects JSONB NOT NULL,
  severity VARCHAR(50) NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Risks (from risk.entity.ts)
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  severity VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'identified',
  detection_rule VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Token Usage (from ai-token-usage.entity.ts)
CREATE TABLE ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tokens_limit INTEGER NOT NULL,
  tokens_purchased INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Interactions (from ai-interaction.entity.ts)
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model_used VARCHAR(50) DEFAULT 'gpt-4',
  response_time_ms INTEGER,
  metadata JSONB,
  feedback VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Definitions (from kpi-definition.entity.ts)
CREATE TABLE kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  unit VARCHAR(20),
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization Mandatory KPIs (from organization-mandatory-kpi.entity.ts)
CREATE TABLE organization_mandatory_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  kpi_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Keys
ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE user_organizations ADD CONSTRAINT fk_user_orgs_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_organizations ADD CONSTRAINT fk_user_orgs_org FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE portfolios ADD CONSTRAINT fk_portfolios_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE portfolios ADD CONSTRAINT fk_portfolios_owner FOREIGN KEY (owner_id) REFERENCES users(id);
ALTER TABLE programs ADD CONSTRAINT fk_programs_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id);
ALTER TABLE templates ADD CONSTRAINT fk_templates_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE template_phases ADD CONSTRAINT fk_template_phases_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE projects ADD CONSTRAINT fk_projects_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_program FOREIGN KEY (program_id) REFERENCES programs(id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_manager FOREIGN KEY (project_manager_id) REFERENCES users(id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_creator FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_template FOREIGN KEY (template_id) REFERENCES templates(id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE organization_mandatory_kpis ADD CONSTRAINT fk_org_kpis_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_mandatory_kpis ADD CONSTRAINT fk_org_kpis_kpi FOREIGN KEY (kpi_id) REFERENCES kpi_definitions(id) ON DELETE CASCADE;

-- Insert Initial Data
INSERT INTO organizations (id, name, plan_type) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Organization', 'trial');

INSERT INTO users (email, password, first_name, last_name, role, organization_id, is_active, is_email_verified)
VALUES ('demo@zephix.com', '$2b$10$LF5Z0Iut.YzESnFvdI41geI89wYCPnYzowc9Org7r.itYQMWFcTqW', 'Demo', 'User', 'ADMIN', '550e8400-e29b-41d4-a716-446655440000', true, true);

-- System Templates
INSERT INTO templates (id, name, description, methodology, is_system, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Software Development', 'Standard SDLC template', 'agile', true, true),
('550e8400-e29b-41d4-a716-446655440002', 'Marketing Campaign', 'Marketing campaign template', 'waterfall', true, true),
('550e8400-e29b-41d4-a716-446655440003', 'Product Launch', 'Product launch template', 'hybrid', true, true);

-- Template Phases
INSERT INTO template_phases (template_id, name, order_index, duration_days) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Planning', 1, 14),
('550e8400-e29b-41d4-a716-446655440001', 'Design', 2, 21),
('550e8400-e29b-41d4-a716-446655440001', 'Development', 3, 60),
('550e8400-e29b-41d4-a716-446655440001', 'Testing', 4, 21),
('550e8400-e29b-41d4-a716-446655440001', 'Deployment', 5, 7);

COMMIT;
