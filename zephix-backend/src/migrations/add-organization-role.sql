-- Add organization_role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_role VARCHAR(20) DEFAULT 'member';

-- Update existing users to have appropriate roles
UPDATE users SET organization_role = 'admin' WHERE email LIKE '%adeel%' OR email LIKE '%admin%' OR role = 'admin';

-- Set all other users to member role
UPDATE users SET organization_role = 'member' WHERE organization_role IS NULL;










