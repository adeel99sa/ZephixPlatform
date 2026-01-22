/**
 * Patch 3: Phase 5.1 UAT Mode Feature Flag
 *
 * When PHASE_5_1_UAT_MODE is true:
 * - Admin Console links are hidden from navigation
 * - /admin routes redirect to /home or /templates
 *
 * Set to false to enable admin console for internal testing.
 */
export const PHASE_5_1_UAT_MODE = false;

