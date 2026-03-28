# Template Center API Stability

This document defines MVP-stable API shape and guarantees. **No breaking changes until v2.** Additive fields only.

## MVP-stable endpoints

All Template Center endpoints under `/api/template-center/*` are MVP-stable for the following:

| Endpoint | Method | Stability |
|----------|--------|-----------|
| `/api/template-center/templates` | GET | MVP-stable |
| `/api/template-center/templates/:templateKey` | GET | MVP-stable |
| `/api/template-center/kpis` | GET | MVP-stable |
| `/api/template-center/docs` | GET | MVP-stable |
| `/api/template-center/search` | GET | MVP-stable |
| `/api/template-center/projects/:projectId/apply` | POST | MVP-stable |
| `/api/template-center/projects/:projectId/documents` | GET | MVP-stable |
| `/api/template-center/projects/:projectId/documents/:documentId` | GET | MVP-stable |
| `/api/template-center/projects/:projectId/documents/:documentId/history` | GET | MVP-stable |
| `/api/template-center/projects/:projectId/documents/:documentId/transition` | POST | MVP-stable |
| `/api/template-center/projects/:projectId/documents/:documentId/assignees` | PATCH | MVP-stable |
| `/api/template-center/projects/:projectId/kpis` | GET | MVP-stable |
| `/api/template-center/projects/:projectId/kpis/:kpiKey/value` | PUT | MVP-stable |
| `/api/template-center/projects/:projectId/gates/:gateKey/decide` | POST | MVP-stable |
| `/api/template-center/projects/:projectId/evidence-pack` | GET | MVP-stable |

## Guaranteed response fields

- **Templates list**: `id`, `scope`, `templateKey`, `name`, `description`, `category`, `isPrebuilt`, `isAdminDefault`, `latestVersion` (object with `version`, `status`).
- **Search results**: Each item has `type`, `key`, `title`, `score`, `payload` (never undefined). Template items: `payload.templateKey`, `payload.latestVersion`. Command items: `payload.commandId`.
- **Apply response**: `applied`, `templateKey`, `version`, `lineageId`, `createdKpis`, `createdDocs`, `existingKpis`, `existingDocs`.
- **Evidence pack**: `templateLineage`, `documents` (array), `kpis` (array), `gates` (array). Arrays are never null.

## Fields that may expand later

- Search `payload` may gain additional keys per type (e.g. `category`, `unit`).
- Evidence pack may add optional `format` or extra metadata.
- Template definition may gain optional fields (e.g. `tags`, `icon`).
- Gate decide response may gain optional `evidence` or `links`.

Additions will be **additive only**. Existing field names and types will not change until v2.

## No breaking changes until v2

- Endpoint paths and HTTP methods will not change.
- Existing response field names and types will not change.
- Query parameter names will not change.
- New optional query parameters or body fields may be added.
- New optional response fields may be added.
