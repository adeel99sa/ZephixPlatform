-- Add new columns to resources table for three-tier system
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'full_member',
ADD COLUMN IF NOT EXISTS requires_account BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;

-- Add constraints
ALTER TABLE resources 
ADD CONSTRAINT IF NOT EXISTS check_resource_type 
CHECK (resource_type IN ('full_member', 'guest', 'external'));

ALTER TABLE resources 
ADD CONSTRAINT IF NOT EXISTS check_invitation_status 
CHECK (invitation_status IN ('pending', 'accepted', 'declined') OR invitation_status IS NULL);

-- Update existing resources to have proper resource_type
UPDATE resources 
SET resource_type = 'full_member', requires_account = true
WHERE resource_type IS NULL;

