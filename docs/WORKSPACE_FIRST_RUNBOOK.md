# Workspace-First IA Guardrails Runbook

## 🚨 **Regression Prevention**

### If someone re-adds a global "+ New"
- **ESLint fails the PR**: `no-restricted-imports` blocks `GlobalCreateMenu`, `GlobalNew*` patterns
- **E2E test fails**: `no-global-create.spec.ts` detects global creation elements
- **Fix**: Remove global creation, use workspace kebab menu instead

### If templates try to apply without workspace
- **E2E test fails**: `workspace-context-required.spec.ts` detects missing workspace context
- **Frontend shows**: "Please select a workspace first" message
- **Fix**: Ensure `activeWorkspaceId` is set before template application

### If DTOs stop requiring workspaceId
- **Contract check fails**: `contracts/projects/projects-api.json` validates 400 response
- **API test fails**: Direct API call without `workspaceId` should return 400
- **Fix**: Ensure `CreateProjectDto.workspaceId` is required (not optional)

## 🔧 **Quick Fixes**

### ESLint False Positives
```bash
# If API client files get flagged for axios usage
# Add to eslint.config.js overrides:
{
  files: ['src/lib/api/**/*.{ts,tsx}', 'src/features/**/api.ts'],
  rules: { 'no-restricted-imports': 'off' }
}
```

### Playwright Selector Drift
```bash
# Use resilient selectors:
const email = page.getByRole('textbox', { name: /email/i }).or(page.getByPlaceholder(/email/i));
const password = page.getByRole('textbox', { name: /password/i }).or(page.getByPlaceholder(/password/i));
```

### Node Version Warnings
```bash
# Ensure .nvmrc and package.json engines match:
echo "20.11.1" > .nvmrc
# In package.json: "engines": { "node": "20.11.1" }
```

## ✅ **Verification Commands**

```bash
# Frontend build & lint
cd zephix-frontend && npm ci && npm run build && npm run lint:new

# Backend API test
curl -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test"}' | jq '.error.message'
# Should return: "workspaceId is required"

# E2E tests
cd zephix-e2e && npm run test:real -- tests/no-global-create.spec.ts
cd zephix-e2e && npm run test:real -- tests/template-center.apply.spec.ts
cd zephix-e2e && npm run test:real -- tests/workspace-context-required.spec.ts
```

## 🎯 **Success Criteria**

- ✅ No global creation UI elements
- ✅ All creation flows require workspace context
- ✅ Template Center shows workspace selection modal when needed
- ✅ Backend returns 400 for missing workspaceId
- ✅ ESLint blocks forbidden imports
- ✅ E2E tests pass for all IA guardrails

