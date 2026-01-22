# Phase 1 Implementation Summary - Remove Placeholder Scaffolding

**Branch:** `recovery/workspace-mvp`  
**Date:** 2026-01-XX  
**Goal:** Every visible button must have real end-to-end behavior

---

## Commits

1. **feat(docs,forms): minimal create and open flows** (`3fa1d289`)
2. **fix(sidebar): plus menu creates real items** (`e29b8343`)
3. **fix(workspace-home): wire buttons to real flows** (`d2a42b72`)
4. **chore(proofs): add manual proof checklist for buttons** (`e5b17320`)

---

## Files Changed by Commit

### Commit 1: feat(docs,forms): minimal create and open flows

**Backend:**
- `zephix-backend/src/modules/docs/entities/doc.entity.ts` (NEW)
- `zephix-backend/src/modules/docs/dto/create-doc.dto.ts` (NEW)
- `zephix-backend/src/modules/docs/dto/update-doc.dto.ts` (NEW)
- `zephix-backend/src/modules/docs/docs.service.ts` (NEW)
- `zephix-backend/src/modules/docs/docs.controller.ts` (NEW)
- `zephix-backend/src/modules/docs/docs.module.ts` (NEW)
- `zephix-backend/src/modules/forms/entities/form.entity.ts` (NEW)
- `zephix-backend/src/modules/forms/dto/create-form.dto.ts` (NEW)
- `zephix-backend/src/modules/forms/dto/update-form.dto.ts` (NEW)
- `zephix-backend/src/modules/forms/forms.service.ts` (NEW)
- `zephix-backend/src/modules/forms/forms.controller.ts` (NEW)
- `zephix-backend/src/modules/forms/forms.module.ts` (NEW)
- `zephix-backend/src/app.module.ts` (MODIFIED - added DocsModule and FormsModule)

**Frontend:**
- `zephix-frontend/src/features/docs/api.ts` (NEW)
- `zephix-frontend/src/features/forms/api.ts` (NEW)
- `zephix-frontend/src/pages/docs/DocsPage.tsx` (REPLACED - was placeholder)
- `zephix-frontend/src/pages/forms/FormsPage.tsx` (REPLACED - was placeholder)
- `zephix-frontend/src/App.tsx` (MODIFIED - updated routes to `/docs/:docId` and `/forms/:formId/edit`)

### Commit 2: fix(sidebar): plus menu creates real items

**Frontend:**
- `zephix-frontend/src/features/workspaces/SidebarWorkspaces.tsx` (MODIFIED - plus menu Doc and Form buttons now create real items)

### Commit 3: fix(workspace-home): wire buttons to real flows

**Frontend:**
- `zephix-frontend/src/pages/workspaces/WorkspaceHomePage.tsx` (MODIFIED - added Quick Actions section with New doc and New form buttons)

### Commit 4: chore(proofs): add manual proof checklist for buttons

**Documentation:**
- `proofs/recovery/PHASE1_BUTTONS_CHECKLIST.md` (NEW)

---

## API Endpoints

### Docs

- `POST /api/workspaces/:workspaceId/docs`
  - Body: `{ "title": string }`
  - Response: `{ "data": { "docId": string } }`

- `GET /api/docs/:docId`
  - Response: `{ "data": { "id": string, "workspaceId": string, "title": string, "content": string, "createdAt": string } }`

- `PATCH /api/docs/:docId`
  - Body: `{ "title"?: string, "content"?: string }`
  - Response: `{ "data": { ...doc } }`

### Forms

- `POST /api/workspaces/:workspaceId/forms`
  - Body: `{ "title": string }`
  - Response: `{ "data": { "formId": string } }`

- `GET /api/forms/:formId`
  - Response: `{ "data": { "id": string, "workspaceId": string, "title": string, "schema": any, "createdAt": string } }`

- `PATCH /api/forms/:formId`
  - Body: `{ "title"?: string, "schema"?: any }`
  - Response: `{ "data": { ...form } }`

---

## Test URLs

### Frontend Routes

1. **Login:** `http://localhost:5173/login`
2. **Home:** `http://localhost:5173/home`
3. **Workspace Home:** `http://localhost:5173/workspaces/:workspaceId/home`
4. **Template Center:** `http://localhost:5173/templates`
5. **Doc Editor:** `http://localhost:5173/docs/:docId`
6. **Form Editor:** `http://localhost:5173/forms/:formId/edit`

---

## CURL Commands for Testing

### Create Doc

```bash
curl -X POST http://localhost:3000/api/workspaces/{workspaceId}/docs \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Doc"}'
```

### Create Form

```bash
curl -X POST http://localhost:3000/api/workspaces/{workspaceId}/forms \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Form"}'
```

### Get Doc

```bash
curl -X GET http://localhost:3000/api/docs/{docId} \
  -H "Authorization: Bearer {token}"
```

### Get Form

```bash
curl -X GET http://localhost:3000/api/forms/{formId} \
  -H "Authorization: Bearer {token}"
```

### Update Doc

```bash
curl -X PATCH http://localhost:3000/api/docs/{docId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "content": "Updated content"}'
```

### Update Form

```bash
curl -X PATCH http://localhost:3000/api/forms/{formId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "schema": {"fields": []}}'
```

---

## Database Migration Required

After pulling these changes, run migrations to create the new tables:

```bash
# The entities will be picked up by TypeORM migrations
# Run migration generation:
npm run migration:generate -- -n AddDocsAndForms

# Or if using TypeORM CLI directly:
typeorm migration:generate -n AddDocsAndForms
```

**Tables to be created:**
- `docs` (id, workspace_id, title, content, created_at, updated_at)
- `forms` (id, workspace_id, title, schema, created_at, updated_at)

---

## Testing Checklist

See `proofs/recovery/PHASE1_BUTTONS_CHECKLIST.md` for complete manual testing steps.

**Quick Test:**
1. Login → should land on `/home`
2. Select workspace → should navigate to `/workspaces/:id/home`
3. Click plus menu → "Doc" → should create doc and open `/docs/:docId`
4. Click plus menu → "Form" → should create form and open `/forms/:formId/edit`
5. Edit doc → save → should persist changes
6. Edit form → save → should persist changes
7. Workspace home "Open Template Center" → should navigate to `/templates`
8. Workspace home "New doc" → should create and open doc
9. Workspace home "New form" → should create and open form

---

## Next Steps

1. Run database migrations
2. Test all buttons in browser
3. Export HAR files and screenshots per checklist
4. Verify no `/members` calls in network tab
5. Fix any issues found during testing

---

*Implementation complete. Ready for manual testing.*
