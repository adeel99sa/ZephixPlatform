# API Migration Instructions

## Files to Update (14 files with response.data):
1. src/hooks/useApi.ts
2. src/hooks/useDocumentProcessing.ts
3. src/hooks/useProjectGeneration.ts
4. src/hooks/useProjectInitiation.ts
5. src/pages/ai/AISuggestionsPage.tsx
6. src/pages/collaboration/CollaborationPage.tsx
7. src/pages/intake/IntakeFormsPage.tsx
8. src/pages/reports/ReportsPage.tsx
9. src/pages/settings/SettingsPage.tsx
10. src/pages/team/TeamPage.tsx
11. src/pages/templates/TemplatesPage.tsx
12. src/pages/workflows/WorkflowsPage.tsx
13. src/pages/WorkflowTemplateList.tsx
14. src/stores/organizationStore.ts

## For each file:
1. Change `response.data` to just `response`
2. Remove `.data` accessor
3. Update any destructuring like `const { data } = response` to `const data = response`
4. Keep all error handling intact

## Import Updates (25 files):
Change:
- `import { api } from '../services/api'` to `import { apiGet, apiPost, apiPut, apiDelete } from '../services/api.service'`
- `import { apiJson } from '../services/api'` to `import { apiRequest } from '../services/api.service'`

## Remove Mock Data (1 file):
- Delete all references to mockApi in src/stores/projectStore.ts
