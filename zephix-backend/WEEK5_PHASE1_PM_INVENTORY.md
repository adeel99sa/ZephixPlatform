# Week 5 Phase 1: src/pm Inventory

## Active References

| Entity / Module | Path | Imported By | Status |
| :--- | :--- | :--- | :--- |
| **RiskManagementModule** | `src/pm/risk-management/risk-management.module.ts` | `src/app.module.ts` | **ACTIVE** |
| **PMModule** | `src/pm/pm.module.ts` | None (Not in AppModule) | Inactive |
| **ProjectInitiationModule** | `src/pm/project-initiation/...` | `src/pm/pm.module.ts` | Inactive |
| **StatusReportingModule** | `src/pm/status-reporting/...` | `src/pm/pm.module.ts` | Inactive |

## Analysis

*   **`src/pm` is largely dead code**, except for `RiskManagementModule`.
*   `RiskManagementModule` is imported in `AppModule`.
*   `PMModule` is defined but not used.
*   Entities in `src/pm/entities` (like `ProjectTask`, `UserProject`) are likely duplicates of `src/modules` entities but might have extra fields.

## Migration Plan

1.  **Inspect `RiskManagementModule`**: Determine if it overlaps with `src/modules/risks`.
2.  **Deprecate `src/pm`**:
    *   Remove `RiskManagementModule` from `AppModule` if it's redundant or migrate its unique logic to `src/modules/risks`.
    *   Delete `src/pm` or mark as deprecated.

## Decision

*   **Keep**: Nothing in `src/pm` should be kept long-term.
*   **Migrate**: Check `RiskManagementModule` for unique logic to move to `src/modules/risks`.
*   **Delete**: Everything else.
