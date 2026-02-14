/**
 * Vitest Gating Config — CI-blocking test suite
 *
 * These 38 test files are verified stable and MUST pass on every PR.
 * If a test is flaky, fix it — do not move it to the legacy lane.
 *
 * To move a legacy test into gating:
 *   1. Fix all failures in the test file
 *   2. Add its path to the `include` array below
 *   3. Remove it from test-health.json
 *
 * Run: npm run test:gating
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    include: [
      // ── UI Primitives ─────────────────────────────────────────
      'src/components/ui/__tests__/StatusBadge.test.tsx',
      'src/components/ui/button/__tests__/Button.test.tsx',
      'src/components/ui/form/__tests__/Checkbox.test.tsx',
      'src/components/ui/form/__tests__/FormField.test.tsx',
      'src/components/ui/form/__tests__/Select.test.tsx',
      'src/components/ui/input/__tests__/Input.test.tsx',
      'src/components/ui/overlay/__tests__/Modal.test.tsx',
      'src/components/ui/overlay/__tests__/Pagination.test.tsx',
      'src/components/ui/overlay/__tests__/Tabs.test.tsx',
      'src/components/ui/states/__tests__/EmptyStateCard.test.tsx',
      'src/components/ui/table/__tests__/DataTable.test.tsx',

      // ── Shell & System ────────────────────────────────────────
      'src/components/shell/__tests__/Sidebar.test.tsx',
      'src/components/system/__tests__/ToastProvider.test.tsx',

      // ── Dashboard ─────────────────────────────────────────────
      'src/components/dashboard/__tests__/DashboardSidebar.test.tsx',
      'src/components/dashboard/__tests__/ProjectStats.test.tsx',
      'src/components/dashboard/__tests__/RecentProjects.test.tsx',
      'src/components/resources/__tests__/ResourceHeatmapCell.test.tsx',

      // ── Core Features ─────────────────────────────────────────
      'src/features/attachments/__tests__/attachments.test.tsx',
      'src/features/capacity/__tests__/capacity-gating.test.tsx',
      'src/features/explanations/__tests__/resolveExplanations.test.ts',
      'src/features/org-dashboard/__tests__/org-dashboard.gating.test.tsx',
      'src/features/org-dashboard/__tests__/org-dashboard.render.test.tsx',
      'src/features/portfolios/__tests__/portfolio-executive-summary.test.tsx',
      'src/features/scenarios/__tests__/scenario-gating.test.tsx',

      // ── Projects & Work Management ────────────────────────────
      'src/features/projects/__tests__/phase2c-guard-checks.test.tsx',
      'src/features/projects/components/__tests__/DuplicateProjectModal.test.tsx',
      'src/features/projects/components/__tests__/TaskListSection.restore.test.tsx',
      'src/features/projects/tabs/__tests__/ProjectResourcesTab.test.tsx',
      'src/features/projects/tabs/__tests__/ProjectRisksTab.test.tsx',
      'src/features/projects/tabs/__tests__/board-view.test.tsx',
      'src/features/resources/utils/__tests__/allocation-errors.test.ts',
      'src/features/templates/utils/__tests__/order-preservation.test.ts',
      'src/features/work-management/__tests__/workTasks.stats.api.test.ts',

      // ── Layout & Routing ──────────────────────────────────────
      'src/layouts/__tests__/admin-nav.test.ts',

      // ── API & Utils ───────────────────────────────────────────
      'src/lib/__tests__/api.test.ts',
      'src/lib/api/__tests__/client.test.ts',
      'src/utils/__tests__/access.test.ts',

      // ── Guardrails ────────────────────────────────────────────
      'src/test/guardrails/api-prefix.spec.ts',
    ],
  },
});
