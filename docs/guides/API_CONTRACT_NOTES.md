# API Contract Notes

This document defines the standardized API contract for Zephix backend endpoints.

## Success Response Wrapper

All successful API responses must be wrapped in a `data` object:

```json
{
  "data": {
    // Response payload
  }
}
```

**Examples:**
- `GET /api/projects/:id` returns `{ "data": { "id": "...", "name": "..." } }`
- `POST /api/templates/:id/instantiate-v5_1` returns `{ "data": { "projectId": "...", "phaseCount": 2, "taskCount": 3 } }`
- `GET /api/work/projects/:id/plan` returns `{ "data": { "projectId": "...", "phases": [...] } }`

## Error Response Shape

All error responses must return a flat object with `code` and `message` at the top level:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

**Error codes:**
- `VALIDATION_ERROR` - 400 Bad Request
- `UNAUTHENTICATED` - 401 Unauthorized
- `UNAUTHORIZED` - 403 Forbidden
- `WORKSPACE_REQUIRED` - 403 Forbidden (missing or invalid x-workspace-id)
- `NOT_FOUND` - 404 Not Found
- `INVALID_STATE_TRANSITION` - 409 Conflict
- `LOCKED_PHASE_STRUCTURE` - 409 Conflict
- `WORK_PLAN_INVALID` - 409 Conflict
- `CONFLICT` - 409 Conflict (generic)
- `INTERNAL_ERROR` - 500 Internal Server Error

**Examples:**
```json
{
  "code": "LOCKED_PHASE_STRUCTURE",
  "message": "Project structure is locked. Cannot modify phases after work has started."
}
```

```json
{
  "code": "WORKSPACE_REQUIRED",
  "message": "Workspace header x-workspace-id is required"
}
```

## Request ID Location

Request IDs are returned in the `X-Request-Id` HTTP header, not in the response body.

**Example:**
```
HTTP/1.1 200 OK
X-Request-Id: abc123-def456-ghi789
Content-Type: application/json

{
  "data": { ... }
}
```

## Implementation Notes

- The `ResponseService.success()` method automatically wraps responses in `{ "data": ... }`
- The `ApiErrorFilter` global exception filter ensures all errors follow the `{ code, message }` shape
- Request IDs are set via the `X-Request-Id` header by the error filter
- Do not nest errors under an `error` object
- Do not return raw objects for success responses

