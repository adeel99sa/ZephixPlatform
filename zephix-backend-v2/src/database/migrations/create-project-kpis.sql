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

CREATE INDEX IF NOT EXISTS idx_project_kpis_project ON project_kpis(project_id);
