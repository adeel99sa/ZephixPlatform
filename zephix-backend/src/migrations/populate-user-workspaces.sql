-- First, ensure every workspace has an owner in user_workspaces
INSERT INTO user_workspaces (user_id, workspace_id, role, created_at, updated_at)
SELECT DISTINCT 
  w.owner_id,
  w.id,
  'owner',
  NOW(),
  NOW()
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM user_workspaces uw 
  WHERE uw.user_id = w.owner_id AND uw.workspace_id = w.id
);

-- Add all users to their organization's first workspace as members (temporary for MVP)
INSERT INTO user_workspaces (user_id, workspace_id, role, created_at, updated_at)
SELECT DISTINCT
  u.id,
  w.id,
  'member',
  NOW(),
  NOW()
FROM users u
INNER JOIN workspaces w ON w.organization_id = u.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_workspaces uw 
  WHERE uw.user_id = u.id AND uw.workspace_id = w.id
)
AND w.id = (
  SELECT id FROM workspaces 
  WHERE organization_id = u.organization_id 
  ORDER BY created_at ASC 
  LIMIT 1
);
