-- Create resource_allocations table
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  allocation_percentage INTEGER NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 150),
  hours_per_week DECIMAL(5,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT check_dates CHECK (end_date >= start_date),
  UNIQUE(resource_id, task_id, start_date, end_date)
);

-- Create indexes for performance
CREATE INDEX idx_resource_allocations_resource_dates ON resource_allocations(resource_id, start_date, end_date);
CREATE INDEX idx_resource_allocations_project ON resource_allocations(project_id);
CREATE INDEX idx_resource_allocations_org ON resource_allocations(organization_id);
CREATE INDEX idx_resource_allocations_task ON resource_allocations(task_id);
CREATE INDEX idx_resource_allocations_dates ON resource_allocations(start_date, end_date);











