/**
 * GOV-BUILD WAVE1 Unit 2+5 — gate reach + chain-step affordance hygiene.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { TAB_ORDER, readVisibleTabIds } from '@/features/projects/layout/projectVisibleTabs';
import { gatePlanPath } from '@/features/projects/components/ProjectOverviewPhaseGateStrip';

const ROOT = join(__dirname, '..', '..', '..');
const APP = join(ROOT, 'App.tsx');
const LAYOUT = join(ROOT, 'features', 'projects', 'layout', 'ProjectPageLayout.tsx');
const PANEL = join(ROOT, 'features', 'phase-gates', 'PhaseGatePanel.tsx');
const INDICATOR = join(
  ROOT,
  'views',
  'work-management',
  'components',
  'PhaseGateHeaderIndicator.tsx',
);

describe('GOV-BUILD WAVE1 Unit 2 — gate reach', () => {
  it('default visible tabs include plan', () => {
    expect(TAB_ORDER).toContain('plan');
    expect(TAB_ORDER.indexOf('plan')).toBeLessThan(TAB_ORDER.indexOf('tasks'));
    expect(readVisibleTabIds(null)).toContain('plan');
  });

  it('App mounts ProjectPlanView on /projects/:id/plan and keeps /work deep link', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).toMatch(/path="plan"\s+element=\{<ProjectPlanView/);
    expect(app).not.toMatch(/path="plan"\s+element=\{<NotEnabledInProject/);
    expect(app).toMatch(/path="\/work\/projects\/:projectId\/plan"\s+element=\{<ProjectPlanView/);
  });

  it('Governed badge is a link to the Plan gate surface', () => {
    const layout = readFileSync(LAYOUT, 'utf8');
    expect(layout).toMatch(/data-testid="project-governed-badge"/);
    expect(layout).toMatch(/to=\{`\/work\/projects\/\$\{project\.id\}\/plan`\}/);
  });

  it('gate indicator accepts onOpen for actionable control', () => {
    const src = readFileSync(INDICATOR, 'utf8');
    expect(src).toMatch(/onOpen\?:/);
    expect(src).toMatch(/phase-gate-indicator-open/);
  });

  it('gatePlanPath preserves phaseId and optional submissionId', () => {
    expect(gatePlanPath('p1', 'ph-1')).toBe('/work/projects/p1/plan?phaseId=ph-1');
    expect(gatePlanPath('p1', 'ph-1', 'sub-1')).toBe(
      '/work/projects/p1/plan?phaseId=ph-1&submissionId=sub-1',
    );
  });
});

describe('GOV-BUILD WAVE1 Unit 5 — chain-step affordance hygiene', () => {
  it('chain-step Approve/Reject is wrapped in isAdmin like single-step controls', () => {
    const src = readFileSync(PANEL, 'utf8');
    // Single-step (existing)
    expect(src).toMatch(/sub\.status === 'SUBMITTED' && isAdmin/);
    // Chain-step (Unit 5)
    expect(src).toMatch(
      /isAdmin &&\s*chainExecutionState\.chainStatus === 'IN_PROGRESS'/,
    );
  });
});
