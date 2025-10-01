-- Manual migration to add resource tier columns
-- Run this directly in Railway database

-- Add new columns to resources table
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

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'resources' 
AND column_name IN ('resource_type', 'requires_account', 'invitation_status', 'invited_by', 'invited_at', 'accepted_at')
ORDER BY column_name;

