# DELETE CANDIDATE
# Reason: Milestone marker - superseded
# Original: PROOF_CAPTURE_STATUS.md

# Proof Capture Status

## Issues Found

### 1. Schema Mismatch
- Entity uses `isActive` with `name: 'is_active'` ✅ FIXED
- Entity uses `isSystem` with `name: 'is_system'` ✅ FIXED
- Entity uses `templateScope` but column may not exist in DB
- Migration shows as run but columns missing - possible DB connection mismatch

### 2. DTO Validation
- Added validation decorators to `CreateTemplateDto` ✅ FIXED
- Added `methodology` field to DTO ✅ FIXED

### 3. API Errors
- 01_admin_create_org_template: 500 - "column template_scope does not exist"
- 04_list_templates: 500 - "column t.template_scope does not exist"
- 02_owner_create_workspace_template: 403 (expected, but need to verify)
- 03_member_create_template: 403 (expected)

## Next Steps

1. Verify database connection - backend may be using different DB than migrations
2. Check if migration actually created columns
3. Restart backend after schema fixes
4. Re-run proof capture

## Files Modified

- `zephix-backend/src/modules/templates/entities/template.entity.ts` - Fixed column names
- `zephix-backend/src/modules/templates/dto/template.dto.ts` - Added validation decorators
- `zephix-backend/scripts/capture-template-proofs.sh` - Updated API_BASE to port 3000
