# Infrastructure Layer

This directory contains infrastructure-level code that requires direct database access patterns not allowed in feature modules.

## Purpose

The infrastructure layer exists to isolate code that needs:
- Raw SQL queries (e.g., `manager.query()`, `dataSource.query()`)
- PostgreSQL-specific features (e.g., `SKIP LOCKED` for distributed work-stealing)
- Low-level database operations that cannot be expressed through `TenantAwareRepository`

## Allowed Patterns

In this directory only, the following patterns are **explicitly allowed**:

- `manager.query()` - For raw SQL queries
- `dataSource.query()` - For raw SQL queries
- `createQueryRunner()` - For advanced transaction control
- `manager.getRepository()` - For direct repository access within transactions
- `DataSource.getRepository()` - For direct repository access

These patterns are **forbidden** in `src/modules/**` but allowed here because:
1. Infrastructure code operates at a lower abstraction level
2. It handles cross-cutting concerns (outbox processing, migrations, etc.)
3. It requires database-specific features that cannot be abstracted

## Current Services

### `outbox/outbox-processor.service.ts`

**Purpose**: Background worker for processing outbox events (email verification, invites)

**Why raw SQL**: Uses PostgreSQL `SKIP LOCKED` for safe multi-replica work-stealing. This pattern:
- Prevents duplicate processing across replicas
- Allows horizontal scaling of workers
- Cannot be expressed through TypeORM query builder

**Allowed patterns**:
- `manager.query()` with `FOR UPDATE SKIP LOCKED`
- Direct `DataSource` injection for transaction control

## Review Rules

Before adding code to this directory:

1. **Justification Required**: Document why `TenantAwareRepository` cannot be used
2. **Tenant Safety**: Even in infrastructure code, ensure tenant isolation where applicable
3. **Tests Required**: All infrastructure code must have integration tests
4. **Architecture Review**: Changes to this directory require explicit approval

## Testing

Infrastructure code must include:
- Integration tests that verify database operations
- Tests for error handling and edge cases
- Tests for concurrent execution (where applicable, e.g., outbox processor)

## Migration Path

If you find code in `src/modules/**` that needs raw SQL:

1. **First**: Try to refactor to use `TenantAwareRepository` query builder
2. **If impossible**: Move to `src/infrastructure/` with justification
3. **Update**: Add entry to this README explaining why

Do not weaken the policy for feature modules. Move infrastructure code here instead.
