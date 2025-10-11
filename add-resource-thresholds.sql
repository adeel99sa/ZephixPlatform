-- Add threshold fields to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS warning_threshold INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS critical_threshold INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_threshold INTEGER DEFAULT 120;

-- Create resource_conflicts table
CREATE TABLE IF NOT EXISTS resource_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID REFERENCES resources(id),
  project_id UUID REFERENCES projects(id),
  week_start DATE NOT NULL,
  allocation_percentage INTEGER NOT NULL,
  conflict_type VARCHAR(20) NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  organization_id UUID REFERENCES organizations(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_resource ON resource_conflicts(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_org ON resource_conflicts(organization_id);
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_resolved ON resource_conflicts(resolved);











