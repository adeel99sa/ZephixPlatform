# Phase 5.1: Controller Route Order Patterns

**Purpose**: Prevent route shadowing by enforcing exact route ordering in controllers.

## Pattern Rules

### 1. Collection Routes First
- `GET ""` (list)
- `POST ""` (create)

### 2. Static Subpaths Before Dynamic Params
- `GET "bulk"` or `PATCH "bulk"`
- `GET "search"`
- `GET "templates"`
- `GET "stats"`
- `GET "summary"`

### 3. Nested Routes Under `:id` Before Plain `:id`
- `GET ":id/comments"`
- `POST ":id/comments"`
- `GET ":id/dependencies"`
- `POST ":id/dependencies"`
- `DELETE ":id/dependencies/:depId"`
- `GET ":id/activity"`

### 4. Plain `:id` Routes After All Above
- `GET ":id"` (must come after all nested routes)
- `PATCH ":id"` (after GET)
- `DELETE ":id"` (last)

### 5. Never Place `@Get(':id')` Above Literal Segments
- Any route starting with a literal segment (e.g., `bulk`, `search`, `templates`) must come before `@Get(':id')`
- This prevents `/api/tasks/bulk` from matching `@Get(':id')` and returning task with id="bulk"

## Concrete Ordering for TasksController

**Controller Path**: `/api/tasks`

**Implement methods in this exact order:**

1. `GET /api/tasks`
   ```typescript
   @Get()
   listTasks()
   ```

2. `POST /api/tasks`
   ```typescript
   @Post()
   createTask()
   ```

3. `PATCH /api/tasks/bulk`
   ```typescript
   @Patch('bulk')
   bulkUpdate()
   ```

4. `GET /api/tasks/:id/activity`
   ```typescript
   @Get(':id/activity')
   listActivity()
   ```

5. `GET /api/tasks/:id/comments`
   ```typescript
   @Get(':id/comments')
   listComments()
   ```

6. `POST /api/tasks/:id/comments`
   ```typescript
   @Post(':id/comments')
   addComment()
   ```

7. `GET /api/tasks/:id/dependencies`
   ```typescript
   @Get(':id/dependencies')
   listDependencies()
   ```

8. `POST /api/tasks/:id/dependencies`
   ```typescript
   @Post(':id/dependencies')
   addDependency()
   ```

9. `DELETE /api/tasks/:id/dependencies/:depId`
   ```typescript
   @Delete(':id/dependencies/:depId')
   removeDependency()
   ```

10. `GET /api/tasks/:id`
    ```typescript
    @Get(':id')
    getTask()
    ```

11. `PATCH /api/tasks/:id`
    ```typescript
    @Patch(':id')
    updateTask()
    ```

12. `DELETE /api/tasks/:id`
    ```typescript
    @Delete(':id')
    deleteTask()
    ```

## Concrete Ordering for ProjectsController (If Needed)

If adding static routes like `/api/projects/summary`, `/api/projects/search`, `/api/projects/templates`, they must appear before `@Get(':id')`.

**Example:**
1. `@Get()` - List projects
2. `@Post()` - Create project
3. `@Get('search')` - Search projects (if added)
4. `@Get('summary')` - Project summary (if added)
5. `@Get(':id')` - Get project by ID
6. `@Patch(':id')` - Update project
7. `@Delete(':id')` - Delete project

## CI Automated Guard

**Location**: `.github/workflows/ci.yml` → "Check route order (static routes before :id)"

**Checks for TasksController:**
- `@Patch('bulk')` must come before `@Get(':id')`
- `@Get(':id/activity')` must come before `@Get(':id')`
- `@Get(':id/comments')` must come before `@Get(':id')`
- `@Post(':id/comments')` must come before `@Get(':id')`
- `@Get(':id/dependencies')` must come before `@Get(':id')`
- `@Post(':id/dependencies')` must come before `@Get(':id')`
- `@Delete(':id/dependencies/:depId')` must come before `@Get(':id')`

**Implementation:**
- Uses `grep -n` to find line numbers
- Compares line numbers: static route line must be less than `@Get(':id')` line
- Fails CI with clear error message if violated

## Why This Matters

**Route Shadowing Bug Example:**
If `@Get(':id')` comes before `@Patch('bulk')`:
- Request: `PATCH /api/tasks/bulk`
- NestJS matches: `@Get(':id')` with `id="bulk"`
- Result: 404 or wrong handler executed

**Solution:**
- Put `@Patch('bulk')` before `@Get(':id')`
- NestJS matches literal `bulk` first
- Correct handler executes

## Related Documents

- `docs/PHASE5_1_IMPLEMENTATION_PLAN.md` - Full implementation plan
- `.github/workflows/ci.yml` - CI route order checks

