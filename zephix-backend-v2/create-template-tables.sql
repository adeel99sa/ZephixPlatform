-- System templates table
CREATE TABLE IF NOT EXISTS system_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table (user-created)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template phases
CREATE TABLE IF NOT EXISTS template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  system_template_id UUID,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER,
  duration_days INTEGER,
  gate_requirements JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template KPIs  
CREATE TABLE IF NOT EXISTS template_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  system_template_id UUID,
  name VARCHAR(255) NOT NULL,
  target_value DECIMAL,
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system templates
INSERT INTO system_templates (id, name, description, category) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Software Development', 'Standard software development lifecycle', 'Technology'),
('550e8400-e29b-41d4-a716-446655440002', 'Marketing Campaign', 'Marketing campaign management', 'Marketing'),
('550e8400-e29b-41d4-a716-446655440003', 'Product Launch', 'Product launch process', 'Product');

-- Add phases for Software Development template
INSERT INTO template_phases (system_template_id, name, order_index, duration_days) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Planning', 1, 14),
('550e8400-e29b-41d4-a716-446655440001', 'Design', 2, 21),
('550e8400-e29b-41d4-a716-446655440001', 'Development', 3, 60),
('550e8400-e29b-41d4-a716-446655440001', 'Testing', 4, 21),
('550e8400-e29b-41d4-a716-446655440001', 'Deployment', 5, 7);

-- Add KPIs for Software Development template
INSERT INTO template_kpis (system_template_id, name, target_value, unit) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Code Coverage', 80, '%'),
('550e8400-e29b-41d4-a716-446655440001', 'Bug Count', 10, 'count'),
('550e8400-e29b-41d4-a716-446655440001', 'Sprint Velocity', 40, 'points');
