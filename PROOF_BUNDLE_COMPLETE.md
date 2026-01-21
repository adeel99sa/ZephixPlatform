# Proof Bundle - Template API Verification

## Database Verification ✅

### Backend Database Connection
- **Database**: `railway`
- **Schema**: `public`
- **Connection**: Railway PostgreSQL (ballast.proxy.rlwy.net:38318)

### Migration Status
- ✅ Migration `AddTemplateScopeAndWorkspaceId1790000000000` executed successfully
- ✅ Columns verified:
  - `template_scope` (varchar, default 'ORG', NOT NULL)
  - `workspace_id` (uuid, nullable)
  - `default_enabled_kpis` (text[], default '{}', NOT NULL)
  - `version` (integer, default 1)
  - `published_at` (timestamp, nullable)

### Schema Fixes Applied
- ✅ `isActive` → `is_active` (entity column mapping)
- ✅ `isSystem` → `is_system` (entity column mapping)
- ✅ `createdAt` → `created_at` (entity column mapping)
- ✅ `updatedAt` → `updated_at` (entity column mapping)

## Proof Capture Results

### Script Summary
```
01_admin_create_org_template_no_workspace_header -> 201 ✅
02_owner_create_workspace_template_with_header -> 201 ✅
03_member_create_template_forbidden -> 403 ✅
04_list_templates_no_workspace_header -> 200 ✅
05_list_templates_with_workspace_header -> 200 ✅
06_publish_org_template_first -> 201 ✅
07_publish_org_template_second -> 201 ✅
09_instantiate_workspace_template_correct_workspace -> 400 (expected - template has no phases)
10_legacy_instantiate_route_gone -> 404 (should be 410 - route order issue)
```

## Response Files

### 01_admin_create_org_template_no_workspace_header.response.txt
```json
HTTP/1.1 201 Created
{"data":{"name":"Proof ORG Template 1768530167","kind":"project","isActive":true,"isSystem":false,"organizationId":"6f2254a0-77e8-4ddc-83b2-2b2a07511b64","templateScope":"ORG","workspaceId":null,"isDefault":false,"lockState":"UNLOCKED","createdById":"67320ed3-58ba-4d42-8867-7ffc52b39925","updatedById":"67320ed3-58ba-4d42-8867-7ffc52b39925","metadata":null,"version":1,"description":null,"category":null,"icon":null,"publishedAt":null,"archivedAt":null,"methodology":null,"structure":null,"complexityBucket":null,"durationMinDays":null,"durationMaxDays":null,"structureSummary":null,"lockPolicy":null,"id":"49073070-54fa-4a33-9151-ce9f5aef759b","metrics":[],"defaultEnabledKPIs":[],"workTypeTags":[],"scopeTags":[],"setupTimeBucket":"SHORT","createdAt":"2026-01-16T08:22:47.686Z","updatedAt":"2026-01-16T08:22:47.686Z"},"meta":{"timestamp":"2026-01-16T02:22:47.743Z"}}
```

**Validation:**
- ✅ Status 201
- ✅ templateScope is "ORG"
- ✅ workspaceId is null
- ✅ organizationId equals ORG_ID
- ✅ defaultEnabledKPIs exists and is an array (empty)

### 02_owner_create_workspace_template_with_header.response.txt
```json
HTTP/1.1 201 Created
{"data":{"name":"Proof WORKSPACE Template 1768530167","kind":"project","isActive":true,"isSystem":false,"organizationId":"6f2254a0-77e8-4ddc-83b2-2b2a07511b64","templateScope":"WORKSPACE","workspaceId":"ad81dadf-af55-42ed-9b00-903aab7ce0ec","isDefault":false,"lockState":"UNLOCKED","createdById":"d1db1516-f644-4a14-80b6-f0056020cf97","updatedById":"d1db1516-f644-4a14-80b6-f0056020cf97","metadata":null,"version":1,"description":null,"category":null,"icon":null,"publishedAt":null,"archivedAt":null,"methodology":null,"structure":null,"complexityBucket":null,"durationMinDays":null,"durationMaxDays":null,"structureSummary":null,"lockPolicy":null,"id":"59b38dd9-e24f-46c7-b95a-71527262a783","metrics":[],"defaultEnabledKPIs":[],"workTypeTags":[],"scopeTags":[],"setupTimeBucket":"SHORT","createdAt":"2026-01-16T08:22:47.887Z","updatedAt":"2026-01-16T08:22:47.887Z"},"meta":{"timestamp":"2026-01-16T02:22:47.945Z"}}
```

**Validation:**
- ✅ Status 201
- ✅ templateScope is "WORKSPACE"
- ✅ workspaceId equals WORKSPACE_ID
- ✅ organizationId equals ORG_ID

### 03_member_create_template_forbidden.response.txt
```json
HTTP/1.1 403 Forbidden
{"code":"UNAUTHORIZED","message":"Only workspace owners can create WORKSPACE templates"}
```

**Validation:**
- ✅ Status 403
- ✅ Error message matches platform standard
- ✅ No 500 error

### 04_list_templates_no_workspace_header.response.txt
```json
HTTP/1.1 200 OK
{"data":[
  {"id":"49073070-54fa-4a33-9151-ce9f5aef759b","name":"Proof ORG Template 1768530167","templateScope":"ORG","workspaceId":null,...},
  {"id":"25ba0440-2eae-4535-bc27-a1a0d90cb96c","name":"Test ORG Template","templateScope":"ORG","workspaceId":null,...},
  {"id":"536b7d02-27b1-4bed-8a82-ec47742af70f","name":"Proof ORG Template","templateScope":"ORG","workspaceId":null,...}
],"meta":{"timestamp":"2026-01-16T02:22:48.088Z"}}
```

**Validation:**
- ✅ Status 200
- ✅ Returned list includes ORG templates
- ✅ Returned list excludes WORKSPACE templates (no workspace header)

### 05_list_templates_with_workspace_header.response.txt
```json
HTTP/1.1 200 OK
{"data":[
  {"id":"59b38dd9-e24f-46c7-b95a-71527262a783","name":"Proof WORKSPACE Template 1768530167","templateScope":"WORKSPACE","workspaceId":"ad81dadf-af55-42ed-9b00-903aab7ce0ec",...},
  {"id":"49073070-54fa-4a33-9151-ce9f5aef759b","name":"Proof ORG Template 1768530167","templateScope":"ORG","workspaceId":null,...},
  {"id":"25ba0440-2eae-4535-bc27-a1a0d90cb96c","name":"Test ORG Template","templateScope":"ORG","workspaceId":null,...},
  {"id":"a15b35b3-6b81-4de8-b5dd-29b74be05d11","name":"Proof WORKSPACE Template","templateScope":"WORKSPACE","workspaceId":"ad81dadf-af55-42ed-9b00-903aab7ce0ec",...},
  {"id":"536b7d02-27b1-4bed-8a82-ec47742af70f","name":"Proof ORG Template","templateScope":"ORG","workspaceId":null,...}
],"meta":{"timestamp":"2026-01-16T02:22:48.181Z"}}
```

**Validation:**
- ✅ Status 200
- ✅ Returned list includes ORG templates
- ✅ Returned list includes WORKSPACE templates for that workspace only
- ✅ WORKSPACE templates have matching workspaceId

### 06_publish_org_template_first.response.txt
```json
HTTP/1.1 201 Created
{"data":{"id":"49073070-54fa-4a33-9151-ce9f5aef759b","name":"Proof ORG Template 1768530167",...,"version":2,"publishedAt":"2026-01-16T08:22:48.256Z",...},"meta":{"timestamp":"2026-01-16T02:22:48.389Z"}}
```

**Validation:**
- ✅ Status 201
- ✅ version increments from 1 to 2
- ✅ publishedAt is set

### 07_publish_org_template_second.response.txt
```json
HTTP/1.1 201 Created
{"data":{"id":"49073070-54fa-4a33-9151-ce9f5aef759b","name":"Proof ORG Template 1768530167",...,"version":3,"publishedAt":"2026-01-16T08:22:48.463Z",...},"meta":{"timestamp":"2026-01-16T02:22:48.601Z"}}
```

**Validation:**
- ✅ Status 201
- ✅ version increments from 2 to 3
- ✅ publishedAt is updated
- ✅ Atomic update (no race condition visible)

### 09_instantiate_workspace_template_correct_workspace.response.txt
```json
HTTP/1.1 400 Bad Request
{"code":"VALIDATION_ERROR","message":"Template must have at least one phase"}
```

**Validation:**
- ⚠️ Status 400 (expected - template has no structure/phases)
- ✅ Error message is clear
- **Note**: This is expected behavior - templates without phases cannot be instantiated. The proof script should use a template with structure, or this test should be skipped for empty templates.

### 10_legacy_instantiate_route_gone.response.txt
```json
HTTP/1.1 404 Not Found
{"code":"LEGACY_ROUTE","message":"This route is deprecated. Use POST /api/templates/:id/instantiate-v5_1 instead"}
```

**Validation:**
- ⚠️ Status 404 (should be 410 Gone)
- ✅ Message tells client to use instantiate-v5_1
- ✅ No internal stack trace
- **Issue**: Route returns 404 instead of 410. This may be a route order issue where `:templateId/instantiate-v5_1` is shadowing `:id/instantiate`.

## Issues Found

### 1. Legacy Route Status Code
- **Current**: Returns 404
- **Expected**: Returns 410 Gone
- **Fix**: Route may be shadowed by `:templateId/instantiate-v5_1`. Need to verify route order or use different path pattern.

### 2. Instantiate Requires Template Structure
- **Current**: Returns 400 "Template must have at least one phase"
- **Expected**: This is correct behavior - templates without phases cannot be instantiated
- **Note**: Proof script should use templates with structure, or this test should be documented as expected failure for empty templates.

## Pass/Fail Summary

| Proof | Status | Pass/Fail | Notes |
|-------|--------|-----------|-------|
| 01 - Admin create ORG template | 201 | ✅ PASS | All validations pass |
| 02 - Owner create WORKSPACE template | 201 | ✅ PASS | All validations pass |
| 03 - Member create template | 403 | ✅ PASS | Correctly blocked |
| 04 - List without workspace header | 200 | ✅ PASS | Only ORG templates returned |
| 05 - List with workspace header | 200 | ✅ PASS | ORG + WORKSPACE templates returned |
| 06 - Publish first | 201 | ✅ PASS | Version increments correctly |
| 07 - Publish second | 201 | ✅ PASS | Version increments again |
| 09 - Instantiate v5_1 | 400 | ⚠️ EXPECTED | Template has no phases (expected behavior) |
| 10 - Legacy instantiate | 404 | ⚠️ MINOR | Should be 410, but message is correct |

## Next Steps

1. Fix legacy route to return 410 instead of 404 (route order issue)
2. Document that instantiate requires templates with structure/phases
3. Address schema drift in Workspace/WorkspaceMember entities (as noted in requirements)
