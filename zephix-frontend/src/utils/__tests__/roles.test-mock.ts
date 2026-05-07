/**
 * Theme D Phase 2 — shared RBAC mocks for Vitest.
 *
 * ## When to use this module
 * Use when a component imports `isPlatformAdmin` from `@/utils/access` and tests
 * need to control the admin gate without pulling in the full auth stack. If the
 * SUT also imports `normalizePlatformRole` from `@/utils/roles` (or `@/types/roles`),
 * mock both so legacy role strings and normalization stay under test control.
 *
 * ## When to use a narrower mock
 * If only `@/utils/access` is imported, prefer `vi.mock('@/utils/access', async (importOriginal) => ({
 *   ...(await importOriginal()),
 *   isPlatformAdmin: yourFn,
 * }))` so `isPlatformViewer`, `canEditProject`, etc. keep their real behavior.
 *
 * ## Vitest hoisting
 * `vi.hoisted()` runs before ESM static imports are initialized. Do **not** call
 * `createRolesAccessMocks()` from a top-level import inside `vi.hoisted` — either
 * duplicate `vi.fn()` inside `vi.hoisted` (see TaskListSection.restore.test.tsx) or
 * `require()` a relative path to this file if your runner resolves it.
 *
 * @example
 * ```ts
 * const rbacMocks = vi.hoisted(() => createRolesAccessMocks());
 *
 * vi.mock('@/utils/access', async (importOriginal) => {
 *   const actual = await importOriginal<typeof import('@/utils/access')>();
 *   return { ...actual, isPlatformAdmin: rbacMocks.isPlatformAdmin };
 * });
 *
 * // Import SUT and `createRolesAccessMocks` only after the vi.mock block, or rely on
 * // Vitest's hoisting so mocks apply before the SUT module loads.
 * ```
 */
import { vi } from 'vitest';

type IsPlatformAdminFn = typeof import('@/utils/access').isPlatformAdmin;
type NormalizePlatformRoleFn = typeof import('@/utils/roles').normalizePlatformRole;

export function createRolesAccessMocks(): {
  readonly isPlatformAdmin: ReturnType<typeof vi.fn<Parameters<IsPlatformAdminFn>, ReturnType<IsPlatformAdminFn>>>;
  readonly normalizePlatformRole: ReturnType<
    typeof vi.fn<Parameters<NormalizePlatformRoleFn>, ReturnType<NormalizePlatformRoleFn>>
  >;
} {
  const isPlatformAdmin = vi.fn<Parameters<IsPlatformAdminFn>, ReturnType<IsPlatformAdminFn>>();

  const normalizePlatformRole = vi.fn<
    Parameters<NormalizePlatformRoleFn>,
    ReturnType<NormalizePlatformRoleFn>
  >();

  return { isPlatformAdmin, normalizePlatformRole } as const;
}

export function resetRolesAccessMocks(m: ReturnType<typeof createRolesAccessMocks>): void {
  m.isPlatformAdmin.mockReset();
  m.normalizePlatformRole.mockReset();
}
