-- Only create if not exists to be safe
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  gate_requirements JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kpi_definition_id UUID REFERENCES kpi_definitions(id),
  name VARCHAR(255) NOT NULL,
  target_value DECIMAL,
  current_value DECIMAL DEFAULT 0,
  unit VARCHAR(50),
  status VARCHAR(50) DEFAULT 'on_track',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_kpis_project ON project_kpis(project_id);
