-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  skills JSONB DEFAULT '[]',
  capacity_hours_per_week INTEGER DEFAULT 40,
  cost_per_hour DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create resource_allocations table
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  allocation_percentage INTEGER,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  hours_per_week DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create resource_conflicts table
CREATE TABLE IF NOT EXISTS resource_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  conflict_date DATE NOT NULL,
  total_allocation DECIMAL(5,2) NOT NULL,
  affected_projects JSONB NOT NULL,
  severity VARCHAR(20) NOT NULL,
  resolved BOOLEAN DEFAULT false,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Create user_daily_capacity table
CREATE TABLE IF NOT EXISTS user_daily_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_capacity_hours DECIMAL(5,2) NOT NULL,
  allocated_hours DECIMAL(5,2) NOT NULL,
  allocated_percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  action VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_org ON resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active);

CREATE INDEX IF NOT EXISTS idx_ra_dates ON resource_allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ra_org_resource ON resource_allocations(organization_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_ra_project ON resource_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_ra_task ON resource_allocations(task_id);

CREATE INDEX IF NOT EXISTS idx_conflicts_resource ON resource_conflicts(resource_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_date ON resource_conflicts(conflict_date);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON resource_conflicts(severity);

CREATE INDEX IF NOT EXISTS idx_capacity_user_date ON user_daily_capacity(user_id, date);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);












