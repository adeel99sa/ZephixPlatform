#!/usr/bin/env bash
# SESSION 6 — Action 3: 11-Part Codebase Discovery (run from repo root)
set -e
cd "$(dirname "$0")/.."

echo "============================================"
echo "PART 1: SIGNUP & AUTH FLOW"
echo "============================================"

echo "=== 1A: Auth service registration ==="
head -200 zephix-backend/src/modules/auth/auth.service.ts

echo ""
echo "=== 1B: Org signup service ==="
cat zephix-backend/src/modules/organizations/organization-signup.service.ts 2>/dev/null || echo "FILE NOT FOUND"

echo ""
echo "=== 1C: Post-creation hooks/events ==="
grep -rn "afterInsert\|afterCreate\|EventEmitter\|emit\|onEvent\|@OnEvent" \
  zephix-backend/src/modules/auth/ --include="*.ts" 2>/dev/null | head -20
grep -rn "afterInsert\|afterCreate\|EventEmitter\|emit\|onEvent\|@OnEvent" \
  zephix-backend/src/modules/organizations/ --include="*.ts" 2>/dev/null | head -20

echo ""
echo "============================================"
echo "PART 2: ORGANIZATION ENTITY & RELATIONSHIPS"
echo "============================================"

echo "=== 2A: Organization entity ==="
cat zephix-backend/src/modules/organizations/entities/organization.entity.ts 2>/dev/null || \
  find zephix-backend/src -name "organization.entity.ts" -exec cat {} \; 2>/dev/null | head -100

echo ""
echo "=== 2B: User-Organization relationship ==="
find zephix-backend/src -name "*.entity.ts" -exec grep -l "UserOrganization\|user_organizations" {} \; 2>/dev/null | head -5
find zephix-backend/src -name "*user-organization*" -o -name "*user_organization*" 2>/dev/null | head -5

echo ""
echo "============================================"
echo "PART 3: WORKSPACE CREATION"
echo "============================================"

echo "=== 3A: Workspace create method ==="
grep -n "async create\b" zephix-backend/src/modules/workspaces/workspaces.service.ts 2>/dev/null | head -5
grep -A 50 "async create\b" zephix-backend/src/modules/workspaces/workspaces.service.ts 2>/dev/null | head -60

echo ""
echo "=== 3B: Default workspace on signup ==="
grep -rn "default.*workspace\|createDefaultWorkspace\|firstWorkspace" \
  zephix-backend/src --include="*.ts" 2>/dev/null | head -10

echo ""
echo "============================================"
echo "PART 4: TEMPLATE SYSTEM"
echo "============================================"

echo "=== 4A: System template definitions summary ==="
wc -l zephix-backend/src/modules/templates/data/system-template-definitions.ts 2>/dev/null
echo "--- Template codes ---"
grep -n "code:" zephix-backend/src/modules/templates/data/system-template-definitions.ts 2>/dev/null | head -20
echo "--- ACTIVE_TEMPLATE_CODES ---"
grep -A 10 "ACTIVE_TEMPLATE_CODES" zephix-backend/src/modules/templates/data/system-template-definitions.ts 2>/dev/null

echo ""
echo "=== 4B: Template entity key fields ==="
grep -n "templateScope\|organizationId\|isActive\|isSystem\|phases\|taskTemplates\|columnConfig\|structure" \
  zephix-backend/src/modules/templates/entities/template.entity.ts 2>/dev/null | head -20

echo ""
echo "=== 4C: Seed script ==="
wc -l zephix-backend/src/scripts/seed-system-templates.ts 2>/dev/null
grep -n "isActive\|is_active\|ACTIVE" zephix-backend/src/scripts/seed-system-templates.ts 2>/dev/null | head -10

echo ""
echo "=== 4D: Template list API ==="
grep -A 30 "async listV1\|async list\b" \
  zephix-backend/src/modules/templates/services/templates.service.ts 2>/dev/null | head -40

echo ""
echo "============================================"
echo "PART 5: GOVERNANCE CATALOG"
echo "============================================"

echo "=== 5A: Governance catalog files ==="
find zephix-backend/src -name "*governance*catalog*" -o -name "*governance*seed*" -o -name "*governance*definition*" 2>/dev/null | head -10

echo ""
echo "=== 5B: Governance catalog content ==="
find zephix-backend/src -name "*governance*catalog*" -exec head -100 {} \; 2>/dev/null

echo ""
echo "=== 5C: How governance page loads policies ==="
grep -rn "async getCatalog\|async listCatalog\|async getGovernanceCatalog\|governance.*catalog" \
  zephix-backend/src --include="*.ts" 2>/dev/null | head -15

echo ""
echo "============================================"
echo "PART 6: USER SETTINGS"
echo "============================================"

echo "=== 6A: User settings entity ==="
cat zephix-backend/src/modules/users/entities/user-settings.entity.ts 2>/dev/null || echo "FILE NOT FOUND"

echo ""
echo "=== 6B: Settings create/fetch ==="
grep -n "async getSettings\|async createSettings\|async getPreferences\|async getUserSettings\|findOrCreate\|preferences" \
  zephix-backend/src/modules/users/ -r --include="*.ts" 2>/dev/null | head -15

echo ""
echo "=== 6C: Does GET preferences auto-create if missing? ==="
grep -A 40 "async getPreferences\|async getUserSettings" \
  zephix-backend/src/modules/users/users.service.ts 2>/dev/null | head -50

echo ""
echo "============================================"
echo "PART 7: ONBOARDING STATE"
echo "============================================"

echo "=== 7A: Onboarding tracking ==="
grep -rn "onboarding\|Onboarding\|firstLogin\|setupComplete\|welcomeShown" \
  zephix-backend/src --include="*.ts" 2>/dev/null | head -20

echo ""
echo "============================================"
echo "PART 8: BOOTSTRAP / STARTUP HOOKS"
echo "============================================"

echo "=== 8A: Module init / bootstrap hooks ==="
grep -rn "onModuleInit\|onApplicationBootstrap\|OnModuleInit\|OnApplicationBootstrap" \
  zephix-backend/src --include="*.ts" 2>/dev/null | head -20

echo ""
echo "=== 8B: Demo bootstrap ==="
find zephix-backend/src -name "*bootstrap*" -o -name "*demo*boot*" 2>/dev/null | head -5

echo ""
echo "============================================"
echo "PART 9: FEATURE FLAGS / BETA TIERS"
echo "============================================"

echo "=== 9A: Feature flags and beta tiers ==="
grep -rn "featureFlag\|FeatureFlag\|betaTier\|BetaTier\|CORE\|GOVERNANCE\|FULL" \
  zephix-backend/src --include="*.ts" 2>/dev/null | grep -i "entity\|enum\|const\|interface" | head -15

echo ""
echo "============================================"
echo "PART 10: MIGRATIONS"
echo "============================================"

echo "=== 10A: Latest migrations ==="
ls zephix-backend/src/migrations/ 2>/dev/null | tail -5

echo ""
echo "=== 10B: Provisioning-related tables ==="
grep -l "organization\|workspace\|template\|user_settings\|governance" \
  zephix-backend/src/migrations/*.ts 2>/dev/null | tail -15

echo ""
echo "============================================"
echo "PART 11: FRONTEND — NEW USER EXPERIENCE"
echo "============================================"

echo "=== 11A: Post-login routing ==="
grep -rn "postLogin\|afterLogin\|redirectAfterAuth\|firstTimeUser\|onboarding" \
  zephix-frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | head -15

echo ""
echo "=== 11B: Workspace selection/creation ==="
find zephix-frontend/src -name "*workspace*select*" -o -name "*workspace*create*" -o -name "*onboard*" 2>/dev/null | head -10

echo ""
echo "=== 11C: Empty workspace state ==="
grep -rn "no.*workspace\|empty.*workspace\|create.*first\|getStarted" \
  zephix-frontend/src --include="*.tsx" 2>/dev/null | head -10

echo ""
echo "============================================"
echo "DISCOVERY COMPLETE"
echo "============================================"
