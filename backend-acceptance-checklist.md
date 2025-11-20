# Phase 3C Backend Acceptance Checklist
# Hand this to your API team for seamless integration

## ETag & Conflict Handling

### PATCH /api/dashboards/:id
- [ ] **Require If-Match header**: Validate `If-Match: <etag>` is present
- [ ] **ETag comparison**: Compare with row's ETag/version field
- [ ] **412 on mismatch**: Return `412 Precondition Failed` when ETag doesn't match
- [ ] **Return new ETag**: Include updated `ETag` header in response
- [ ] **Audit logging**: Log conflict attempts for monitoring

### GET /api/dashboards/:id
- [ ] **Return ETag**: Include `ETag` header with current version
- [ ] **Support If-None-Match**: Return `304 Not Modified` if ETag matches (optional)
- [ ] **Consistent format**: Ensure ETag format is consistent across endpoints

## Widget Query Optimization

### POST /api/widgets/query
- [ ] **Batch processing**: Handle multiple widgets in single request
- [ ] **Parallel execution**: Process widget queries in parallel on server
- [ ] **Response format**: Return `{ [widgetId]: { ... } }` dictionary
- [ ] **Performance target**: <300ms p95 for 8-12 widgets
- [ ] **Error handling**: Return partial results if some widgets fail

## Audit & Observability

### Write Operations
- [ ] **Correlation ID**: Include correlation ID in all logs
- [ ] **Audit events**: Log all write operations (create, update, delete, restore)
- [ ] **User context**: Include user ID and workspace ID in audit logs
- [ ] **Change tracking**: Log what fields changed in updates

### Error Handling
- [ ] **Consistent error format**: Use standard error response format
- [ ] **Error codes**: Include specific error codes for different failure types
- [ ] **Stack traces**: Include stack traces in development, exclude in production

## Database Schema

### Dashboards Table
- [ ] **ETag field**: Add `etag` or `version` field for optimistic locking
- [ ] **Soft delete**: Add `deleted_at` field for trash functionality
- [ ] **Visibility**: Add `visibility` field (private/workspace/org)
- [ ] **Timestamps**: Include `created_at`, `updated_at` fields

### Widgets Table
- [ ] **Dashboard relation**: Foreign key to dashboards table
- [ ] **Position fields**: Add `x`, `y`, `width`, `height` for layout
- [ ] **Config field**: JSON field for widget configuration
- [ ] **Type field**: Enum for widget types (kpi, table, chart, note)

## API Response Format

### Success Responses
```json
{
  "data": {
    "id": "dash-1",
    "name": "Delivery KPIs",
    "etag": "\"v123\"",
    "widgets": [...],
    "visibility": "workspace"
  }
}
```

### Error Responses
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Dashboard was modified by another user",
    "details": {
      "currentEtag": "\"v124\"",
      "providedEtag": "\"v123\""
    }
  }
}
```

## Performance Requirements

- [ ] **Dashboard load**: <2s for dashboard with 8-12 widgets
- [ ] **Widget query**: <300ms p95 for batch widget queries
- [ ] **Autosave**: <500ms for dashboard updates
- [ ] **Export**: <150ms for CSV generation

## Security

- [ ] **Authorization**: Verify user has access to dashboard/workspace
- [ ] **Input validation**: Validate all input fields
- [ ] **SQL injection**: Use parameterized queries
- [ ] **Rate limiting**: Implement rate limiting for API endpoints

## Testing

- [ ] **Unit tests**: Test ETag conflict handling
- [ ] **Integration tests**: Test full dashboard CRUD flow
- [ ] **Performance tests**: Load test widget queries
- [ ] **Error scenarios**: Test 412, 404, 403 responses
