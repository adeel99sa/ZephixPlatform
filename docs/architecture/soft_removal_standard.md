# Soft Removal Standard

> Platform contract for trash lifecycle across all Zephix entities.
> Last updated: 2026-04-05

## Lifecycle States

Every removable entity follows this lifecycle:

```
Active  ──(move to trash)──>  Trashed  ──(purge)──>  Purged (gone)
                                 │
                                 └──(restore)──>  Active
```

| State | Visible in Product | Visible in Trash | Restorable | Permanently Deleted |
|-------|-------------------|------------------|------------|---------------------|
| Active | Yes | No | N/A | No |
| Trashed | No | Yes | Yes (until purge) | No |
| Purged | No | No | No | Yes |

## Rules

### R1. Archive and delete are the same backend operation
There is no separate "archive" state. All removal goes through soft-delete (`deletedAt` set).

### R2. Supported entities move to Trash, not immediate hard delete
User-initiated delete sets `deletedAt`. No user action causes immediate hard delete.

### R3. Retention is server-owned
The server determines how long items stay in trash. Frontend displays the value but never owns it.
- Default: 30 days (`PLATFORM_TRASH_RETENTION_DAYS_DEFAULT`)
- Configurable via `TRASH_RETENTION_DAYS` or `PLATFORM_TRASH_RETENTION_DAYS` env vars

### R4. Restore is allowed until purge
Any trashed item can be restored as long as it has not been hard-deleted.

### R5. Scheduled purge is the only normal permanent removal path
The retention cron job (`PlatformRetentionCronService`) runs daily and purges items past retention.

### R6. Admin manual purge is allowed only from Trash
Admins can manually purge individual items or trigger batch purge, but only for items already in trash.

### R7. All active queries must exclude trashed records
Every query that serves active product surfaces MUST filter `deletedAt IS NULL` (or rely on TypeORM's `@DeleteDateColumn` auto-filtering when using `TenantAwareRepository`).

### R8. All trash lifecycle actions must be audited
Audit events required: `soft_remove_to_trash`, `restore_from_trash`, `retention_purge_batch`, `permanent_delete_from_trash`.

### R9. Tenant scoping is mandatory for all trash operations
Every trash operation (list, restore, purge) must be scoped by `organizationId`. Workspace-scoped operations must also validate `workspaceId`.

### R10. Child behavior must be explicit per entity
Every parent entity must document:
- Which children are purged with the parent (and in what order)
- Which children are restored with the parent (same-batch semantics)
- Which children are left as orphans (with justification)

See `trash_dependency_matrix.md` for the complete graph.

## Trash-Capable Entities (Phase 1)

| Entity | Independent Trash | Restore Support | Purge Via |
|--------|-------------------|-----------------|-----------|
| Workspace | Yes | Yes (admin) | Admin Trash / Cron |
| Project | Yes | Yes (member+) | Admin Trash / Cron |
| WorkTask | Yes | Yes (member+) | Project purge or direct |
| WorkPhase | Yes | Yes (member+) | Project purge (CASCADE) |

## Entities NOT Trash-Capable (by design)

These use different lifecycle patterns:

| Entity | Pattern | Reason |
|--------|---------|--------|
| Portfolio | `status: ACTIVE/ARCHIVED` | Container, not user-managed content |
| Program | `status: ACTIVE/ARCHIVED` | Container, not user-managed content |
| Team | `isArchived: boolean` | Membership container |
| Template | `archivedAt: timestamp` | Versioned artifact |

## Purge Safety Rules

### PS1. No silent partial purge
Either the entire entity graph purge succeeds in a transaction, or it fails with logged cause.

### PS2. RESTRICT FKs must be explicitly handled
Before hard-deleting a parent, all child entities with RESTRICT FK must be explicitly deleted first.

### PS3. Purge order must follow dependency matrix
Use the explicit purge order defined in `trash_dependency_matrix.md`. Do not rely on luck or implicit ordering.

### PS4. Idempotency
- `moveToTrash` on already-trashed entity: return current trashed state
- `restore` on active entity: no-op or controlled error
- `purge` on already-purged entity: return not-found
- Scheduled purge: safe to rerun after partial failure

### PS5. Transaction boundaries
- Single-entity purge: one transaction for the entity and all its children
- Batch purge: per-entity transactions, not one giant transaction

## Restore Semantics

### RS1. Same-batch restore
When restoring a parent, only children whose `deletedAt` matches the parent's `deletedAt` timestamp are restored. Independently trashed children remain trashed.

### RS2. Ancestor check
Block restore if the parent's parent is still trashed (e.g., don't restore a project if its workspace is trashed).

### RS3. No cascade restore by default
Restoring a workspace does NOT auto-restore its projects. Each entity with independent trash must be restored explicitly.

## Query Hygiene Contract

Every active surface must exclude trashed records. Verified surfaces:

| Surface | Entity | Filter Method |
|---------|--------|---------------|
| Sidebar workspace list | Workspace | `deletedAt IS NULL` (explicit) |
| Projects page | Project | `deletedAt: IsNull()` (explicit) |
| Dashboard data | Project, Phase | `deletedAt: null` (explicit) |
| Task lists | WorkTask | `deletedAt IS NULL` (explicit) |
| Favorites | Workspace, Project, Dashboard | `deletedAt: IsNull()` (required) |
| Admin home counts | Project | `deletedAt: IsNull()` (required) |
| Search | Project | `deletedAt IS NULL` (explicit) |
| Program child projects | Project | `deletedAt: IsNull()` (required) |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `TRASH_RETENTION_DAYS` | 30 | Days before scheduled purge |
| `PLATFORM_TRASH_RETENTION_DAYS` | 30 | Alias for above |
| `RETENTION_PURGE_CRON_ENABLED` | `0` (disabled) | Enable scheduled purge |
| `RETENTION_PURGE_CRON_EXPRESSION` | `0 3 * * *` | Cron schedule (3 AM daily) |

## Startup Validation

At boot, the platform must validate:
- Retention days > 0 and <= 3650
- Cron expression is syntactically valid (if cron enabled)
- Manual purge remains available regardless of cron state

## Future Work (Not in Scope)

- `purgeEligibleAt` column (freeze retention at deletion time)
- Shared `SoftRemovalService` (centralized lifecycle orchestration)
- Independent trash for documents, risks, dashboards
- Cross-domain cleanup for favorites, shares, attachments on purge
- Event-driven derived state invalidation (`entity.trashed`, `entity.restored`, `entity.purged`)
