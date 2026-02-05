# ARCHIVED - Historical
# Teams API Test Instructions

## ✅ Migration Status

The migration has been updated to handle existing tables gracefully. The teams tables should now be ready.

## Quick Test Steps

### 1. Verify Migration
```bash
cd zephix-backend
npm run migration:show
```

Look for `CreateTeamsTables1767000000001` - it should show as executed or skipped if tables exist.

### 2. Start Backend Server
```bash
npm run start:dev
```

Wait for server to start on port 3000.

### 3. Get Admin Token

Login as admin user and get the JWT token from:
- Browser DevTools → Application → Local Storage → `zephix-auth-storage` → `state.accessToken`
- Or use the login endpoint and copy the `accessToken` from response

### 4. Test API Endpoints

#### Option A: Use the test script
```bash
cd zephix-backend
./scripts/test-teams-api.sh <YOUR_ADMIN_TOKEN> [OPTIONAL_WORKSPACE_ID]
```

#### Option B: Manual curl tests

**List Teams:**
```bash
curl http://localhost:3000/api/admin/teams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Team:**
```bash
curl -X POST http://localhost:3000/api/admin/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery Team",
    "shortCode": "DEL",
    "color": "#8B5CF6",
    "visibility": "workspace",
    "description": "Handles delivery work"
  }'
```

**Get Team:**
```bash
curl http://localhost:3000/api/admin/teams/{TEAM_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update Team:**
```bash
curl -X PATCH http://localhost:3000/api/admin/teams/{TEAM_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "color": "#10B981"}'
```

**Archive Team:**
```bash
curl -X DELETE http://localhost:3000/api/admin/teams/{TEAM_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Test Frontend UI

1. Login as admin
2. Navigate to `/admin/teams`
3. Verify:
   - Page loads without errors
   - Empty state shows if no teams
   - "Create Team" button opens drawer
   - Create form submits successfully
   - New team appears in table
   - Edit drawer opens with current values
   - Archive works and team disappears from active list

### 6. RBAC Test

1. Login as Member or Viewer
2. Try to access `/admin/teams`
3. Should get 403 or redirect to `/403`

## Expected Responses

### GET /admin/teams
```json
[
  {
    "id": "uuid",
    "name": "Delivery Team",
    "shortCode": "DEL",
    "color": "#8B5CF6",
    "visibility": "workspace",
    "description": "Handles delivery work",
    "workspaceId": "uuid",
    "status": "active",
    "memberCount": 1,
    "projectCount": 0,
    "createdAt": "2025-01-XX...",
    "updatedAt": "2025-01-XX..."
  }
]
```

### POST /admin/teams
**Status:** 201 Created
**Body:** Same as GET response

### PATCH /admin/teams/:id
**Status:** 200 OK
**Body:** Updated team object

### DELETE /admin/teams/:id
**Status:** 200 OK
**Body:** Team object with `status: "archived"`

## Troubleshooting

### Migration Issues
- If tables already exist, migration will skip gracefully
- Check migration status: `npm run migration:show`

### 401 Unauthorized
- Verify token is valid
- Check token includes `organizationId` in payload
- Ensure user has admin role

### 403 Forbidden
- Verify user role is admin
- Check AdminGuard is working
- Verify `normalizePlatformRole` recognizes the role

### 404 Not Found
- Check AdminModule is imported in AppModule
- Verify TeamsModule is imported in AdminModule
- Restart server after adding modules

### 400 Bad Request
- Check slug uniqueness (must be unique per organization)
- Verify required fields (name, visibility)
- Check field validation (name length 2-100, slug 2-10)

## Success Criteria

✅ Migration runs without errors
✅ GET /admin/teams returns 200 with array
✅ POST /admin/teams creates team and returns 201
✅ GET /admin/teams/:id returns team details
✅ PATCH /admin/teams/:id updates team
✅ DELETE /admin/teams/:id archives team
✅ Frontend AdminTeamsPage loads without errors
✅ Create/Edit drawers work
✅ RBAC blocks non-admins






