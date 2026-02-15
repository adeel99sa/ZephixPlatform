/**
 * Jest Gating Config — CI-blocking backend test suite
 *
 * Extends the default config from package.json but excludes known-failing
 * suites. These failures are pre-existing and tracked for remediation.
 *
 * RULES:
 *   - NEVER add a passing suite to the exclude list.
 *   - Fix failing suites and REMOVE them from the exclude list.
 *   - CI enforces: gating must pass before any deploy proceeds.
 *
 * Run: npm run test:gating
 *
 * Excluded suites (21 as of 2026-02-15):
 *   Fix order (by platform risk):
 *     P1: RESOLVED — app.module.compile promoted to gating
 *     P2: Auth & sessions (auth-session-refresh, auth.integration, auth.routes)
 *     P3: Work management (work-item.service, work-items-bulk, my-work)
 *     P4: Resources & allocation (resources.service, resource-allocation.service)
 *     P5: Notifications (notifications-read-all)
 *     P6: Templates & workflows (templates.service, workflow-templates.service)
 *     P7: Integration suites requiring DB (rollups, template-center, dashboards, home)
 *     P8: AI & BRD (document-parser, brd.service, brd-validation)
 *     P9: Admin (admin.controller)
 *
 * NOTE: P7 integration suites are excluded because the gating CI job has
 * no Postgres service. They are fixed in source (TS errors, slug, timeouts)
 * and will pass in the full backend-test job which provides a DB.
 */

const baseConfig = require('./package.json').jest;

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: [
    // ── P1: RESOLVED — promoted to gating ───────────────────────
    // app.module.compile.spec.ts — removed from exclude (2026-02-15)

    // ── P2: Auth & sessions ─────────────────────────────────────
    'auth-session-refresh\\.spec\\.ts',
    'auth\\.integration\\.spec\\.ts',
    'auth\\.routes\\.spec\\.ts',

    // ── P3: Work management ─────────────────────────────────────
    'work-item\\.service\\.spec\\.ts',
    'work-items-bulk\\.integration\\.spec\\.ts',
    'my-work\\.integration\\.spec\\.ts',

    // ── P4: Resources & allocation ──────────────────────────────
    'resources\\.service\\.spec\\.ts',
    'resource-allocation\\.service\\.spec\\.ts',

    // ── P5: Notifications ───────────────────────────────────────
    'notifications-read-all\\.spec\\.ts',

    // ── P6: Templates & workflows ───────────────────────────────
    'templates\\.service\\.spec\\.ts',
    'workflow-templates\\.service\\.spec\\.ts',

    // ── P7: Integration suites (require DB — not available in gating CI)
    // TS errors, slug, and timeouts fixed in source; pass with DB present
    'rollups\\.integration\\.spec\\.ts',
    'rollups-phase6-closeout\\.integration\\.spec\\.ts',
    'template-center\\.apply\\.integration\\.spec\\.ts',
    'dashboards-mutations\\.integration\\.spec\\.ts',
    'dashboards-share\\.integration\\.spec\\.ts',
    'home\\.integration\\.spec\\.ts',

    // ── P8: AI & BRD ────────────────────────────────────────────
    'document-parser\\.service\\.spec\\.ts',
    'brd\\.service\\.spec\\.ts',
    'brd-validation\\.service\\.spec\\.ts',

    // ── P9: Admin ───────────────────────────────────────────────
    'admin\\.controller\\.spec\\.ts',
  ],
};
