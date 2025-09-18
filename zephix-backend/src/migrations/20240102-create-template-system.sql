-- Project Templates Table
CREATE TABLE project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  methodology VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  default_phases JSONB DEFAULT '[]',
  default_kpis JSONB DEFAULT '[]',
  default_views JSONB DEFAULT '[]',
  default_fields JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, organization_id)
);

-- Lego Blocks Table
CREATE TABLE lego_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'kpi', 'phase', 'view', 'field', 'automation'
  category VARCHAR(50),
  description TEXT,
  configuration JSONB NOT NULL,
  compatible_methodologies JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Blocks Junction Table
CREATE TABLE template_blocks (
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  block_id UUID REFERENCES lego_blocks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  configuration_override JSONB,
  PRIMARY KEY (template_id, block_id)
);

-- Project Template Usage Tracking
CREATE TABLE project_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES project_templates(id),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customizations JSONB DEFAULT '{}'
);

CREATE INDEX idx_templates_org ON project_templates(organization_id);
CREATE INDEX idx_templates_methodology ON project_templates(methodology);
CREATE INDEX idx_blocks_type ON lego_blocks(type);
CREATE INDEX idx_blocks_org ON lego_blocks(organization_id);
CREATE INDEX idx_template_usage_project ON project_template_usage(project_id);


