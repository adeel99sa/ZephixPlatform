/**
 * Barrel: canonical V3 landing only (`./v3`).
 *
 * Legacy pre-V3 marketing components are isolated under `./legacy` (not exported).
 * Default Vitest excludes `legacy/**`; use `npm run test:landing` for active coverage.
 */
export * from './v3';
