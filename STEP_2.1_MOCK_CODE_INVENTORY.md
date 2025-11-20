# Step 2.1.1 — Mock Code Inventory

## Production-Reachable Mock Code

| File Path | Line Numbers | What Mock Does | Production Reachable? |
|-----------|--------------|----------------|----------------------|
| `zephix-frontend/src/features/workspaces/workspace.api.ts` | 5, 41-48, 53, 58-61, 73-76, 95, 109, 119, 129, 151-157, 173, 183, 193, 203, 213 | `USE_MOCK` flag controls all API calls - returns hardcoded data instead of real backend | ✅ YES - controlled by `VITE_WS_API_MOCK` env var |
| `zephix-frontend/src/app/WorkspaceSwitcher.tsx` | 4-7, 12, 23 | Hardcoded `MOCK` array of workspaces | ✅ YES - always used |
| `zephix-frontend/src/pages/admin/AdminTrashPage.tsx` | 17-21 | Hardcoded mock trash items array | ✅ YES - always used |
| `zephix-frontend/src/pages/organizations/TeamManagement.tsx` | 74-114, 136-137, 162-163, 173-174 | Mock team members and invitations data, mock API calls | ✅ YES - always used |
| `zephix-frontend/src/stores/organizationStore.ts` | 31-114 | Mock API functions for organizations, invites, switching | ✅ YES - always used |
| `zephix-frontend/src/stores/mockApi.ts` | Entire file | Complete mock API implementation for projects | ✅ YES - if imported anywhere |

## Test-Only Mock Code (Safe)

| File Path | Purpose | Production Reachable? |
|-----------|---------|----------------------|
| `zephix-frontend/src/lib/__tests__/api.test.ts` | Unit tests | ❌ NO - test files |
| `zephix-frontend/src/features/notifications/api/__tests__/useNotifications.test.ts` | Unit tests | ❌ NO - test files |
| `zephix-frontend/src/pages/projects/__tests__/ProjectsPage.test.tsx` | Unit tests | ❌ NO - test files |
| `zephix-frontend/src/pages/templates/__tests__/TemplatesPage.test.tsx` | Unit tests | ❌ NO - test files |
| `zephix-frontend/src/pages/settings/__tests__/SettingsPage.test.tsx` | Unit tests | ❌ NO - test files |
| `zephix-frontend/src/components/dashboard/__tests__/ChatInterface.test.tsx` | Unit tests | ❌ NO - test files |
| `zephix-frontend/src/components/ui/ProjectCard.stories.tsx` | Storybook stories | ❌ NO - dev only |
| All `*.spec.ts`, `*.test.ts`, `*.test.tsx` files | Test files | ❌ NO - test files |

## Backend Mock Code

| File Path | Line Numbers | What Mock Does | Production Reachable? |
|-----------|--------------|----------------|----------------------|
| `zephix-backend/src/pm/services/ai-chat.service.ts` | 730, 752, 767, 780 | Mock team members, requirements, constraints, stakeholders for demo | ⚠️ YES - but commented as "for demo" |
| `zephix-backend/src/pm/controllers/ai-intelligence.controller.ts` | 215 | Mock data for demonstration | ⚠️ YES - but commented as "for demo" |

## Summary

**Production-Reachable Mocks to Remove:**
1. `workspace.api.ts` - Remove all `USE_MOCK` branches
2. `WorkspaceSwitcher.tsx` - Replace MOCK array with real API call
3. `AdminTrashPage.tsx` - Replace mock data with real API call
4. `TeamManagement.tsx` - Replace mock data with real API calls
5. `organizationStore.ts` - Replace mock API functions with real API calls
6. `mockApi.ts` - Check if used, if so remove or guard as dev-only

**Backend Demo Mocks:**
- Review `ai-chat.service.ts` and `ai-intelligence.controller.ts` - these appear to be demo code, should be guarded or removed

**Test Files:**
- All test mocks are safe and should remain

