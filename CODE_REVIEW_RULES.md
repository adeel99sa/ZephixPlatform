# Code Review Rules - Response Format

## Hard Rule: New Controller Endpoints Must Use response.helper.ts

**All new controller endpoints must use the response helper functions to enforce `{ data: ... }` format.**

### ✅ Correct Pattern

```typescript
import { formatResponse, formatArrayResponse } from '@/shared/helpers/response.helper';

@Get()
async findAll() {
  const items = await this.service.findAll();
  return formatArrayResponse(items); // ✅ Returns { data: items }
}

@Get(':id')
async findOne(@Param('id') id: string) {
  const item = await this.service.findById(id);
  return formatResponse(item); // ✅ Returns { data: item }
}
```

### ❌ Incorrect Patterns

```typescript
// ❌ BAD: Raw array return
@Get()
async findAll() {
  const items = await this.service.findAll();
  return items; // ❌ Returns raw array
}

// ❌ BAD: Raw object return
@Get(':id')
async findOne(@Param('id') id: string) {
  const item = await this.service.findById(id);
  return item; // ❌ Returns raw object
}

// ❌ BAD: Manual wrapping (inconsistent)
@Get()
async findAll() {
  const items = await this.service.findAll();
  return { data: items }; // ❌ Should use helper for consistency
}
```

## CI Guardrail

The CI pipeline includes a grep check that blocks PRs with raw returns in controllers:

```bash
# Checks for: return [...]
# Blocks if not using: formatResponse, formatArrayResponse, formatPaginatedResponse
```

**Exceptions:**
- Health controller (special case)
- Error filters (use different format)

## Review Checklist

When reviewing controller changes:

- [ ] All `@Get()` endpoints use `formatArrayResponse()` or `formatResponse()`
- [ ] All `@Get(':id')` endpoints use `formatResponse()`
- [ ] No raw array/object returns
- [ ] Response helper imported from `@/shared/helpers/response.helper`

## Why This Matters

- **Consistency:** All endpoints return the same format
- **Frontend:** API clients can reliably unwrap `response.data`
- **Testing:** Contract tests validate the format
- **Maintainability:** Single source of truth for response format






