-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL,
    owner_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_workspaces_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_workspaces_owner 
        FOREIGN KEY (owner_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_organization_id ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces(is_active);

-- Add workspace_id column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Add foreign key constraint for workspace_id
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_workspace 
FOREIGN KEY (workspace_id) 
REFERENCES workspaces(id) 
ON DELETE SET NULL;

-- Create index for workspace_id
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

-- Add hierarchy tracking columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hierarchy_type VARCHAR(20) DEFAULT 'direct';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hierarchy_path TEXT;

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_projects_hierarchy_type ON projects(hierarchy_type);
CREATE INDEX IF NOT EXISTS idx_projects_hierarchy_path ON projects(hierarchy_path);








