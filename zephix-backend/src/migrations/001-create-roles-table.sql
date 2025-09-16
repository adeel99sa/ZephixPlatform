CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, permissions) VALUES 
  ('admin', '{"all": true}'),
  ('pm', '{"projects": ["create", "read", "update"], "resources": ["read"]}'),
  ('user', '{"projects": ["read"], "resources": ["read"]}')
ON CONFLICT (name) DO NOTHING;
