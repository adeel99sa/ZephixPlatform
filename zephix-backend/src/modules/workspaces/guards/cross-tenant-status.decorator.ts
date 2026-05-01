import { SetMetadata } from '@nestjs/common';

/**
 * Metadata for HTTP status codes when `RequireWorkspaceAccessGuard` resolves the
 * workspace via `params.slug` (AD-027 batch 1a precursor).
 *
 * **Defaults (slug routes, no decorator):** `403` for both "slug did not resolve
 * to a workspace in the caller's org" and "resolved but caller lacks access".
 *
 * **`@CrossTenantStatus(404)`:** Sets **both** statuses to `404` so endpoints
 * that mask existence (e.g. `GET slug/:slug/home`) match legacy behavior.
 *
 * **`SlugAccessErrorSemantics`:** Per-route tuning — use in PR #229 when a slug
 * endpoint needs `404` for unknown slug but `403` for forbidden (e.g. resolve
 * routes).
 */
export const WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS =
  'workspaceAccessSlugErrorSemantics';

export interface SlugAccessErrorSemantics {
  /** Slug did not match a workspace in the caller's organization */
  notFoundStatus?: 403 | 404;
  /** Workspace matched but caller failed membership / capability checks */
  forbiddenStatus?: 403 | 404;
}

/** Fine-grained status codes for slug-param routes (optional per Architect Decision B). */
export const SlugAccessErrorSemantics = (semantics: SlugAccessErrorSemantics) =>
  SetMetadata(WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS, semantics);

/** Shorthand: same status for slug-not-found and access-denied (existence masking). */
export const CrossTenantStatus = (status: 403 | 404) =>
  SlugAccessErrorSemantics({
    notFoundStatus: status,
    forbiddenStatus: status,
  });
