/**
 * TEMPLATE-UX-1 — derived setup badges, FlatPhase pass-through, process map,
 * getting-started link wiring.
 *
 * Census fixture truth (16 active templates): badge must match
 * S = P + ceil(T/4) + G×2 → Simple / Standard / Advanced.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  deriveSetupLevel,
  hasGettingStartedGuide,
  mapTemplateDto,
  resolveSetupBadge,
  templateGatesArmed,
  type TemplateSetupLevel,
} from '@/features/templates/template.mapper';
import { CANONICAL_PHASE_GATE_LABELS, gateLabel } from '@/features/templates/gate-labels';

const MAPPER = join(__dirname, '..', 'template.mapper.ts');
const PREVIEW = join(__dirname, '..', 'components', 'TemplatePreviewModal.tsx');
const CENTER = join(__dirname, '..', 'components', 'TemplateCenterModal.tsx');
const PROCESS_MAP = join(__dirname, '..', 'components', 'TemplateProcessMap.tsx');

type CensusRow = {
  code: string;
  phases: number;
  tasks: number;
  gates: number;
  expected: TemplateSetupLevel;
};

/** Fixture census — derived formula validation (not seeded metadata.setup). */
const CENSUS_16: CensusRow[] = [
  { code: 'bug_tracker_v1', phases: 1, tasks: 7, gates: 0, expected: 'Simple' },
  { code: 'pm_hybrid_v1', phases: 3, tasks: 6, gates: 2, expected: 'Standard' },
  { code: 'pm_waterfall_v2', phases: 5, tasks: 16, gates: 5, expected: 'Advanced' },
  { code: 'product_discovery_v1', phases: 3, tasks: 6, gates: 0, expected: 'Standard' },
  { code: 'product_launch_v1', phases: 4, tasks: 6, gates: 0, expected: 'Standard' },
  { code: 'roadmap_execution_v1', phases: 4, tasks: 5, gates: 0, expected: 'Standard' },
  { code: 'starter_backlog_v1', phases: 1, tasks: 8, gates: 0, expected: 'Simple' },
  { code: 'starter_board_v1', phases: 1, tasks: 6, gates: 0, expected: 'Simple' },
  { code: 'starter_gantt_v1', phases: 3, tasks: 8, gates: 0, expected: 'Standard' },
  { code: 'starter_simple_project_v1', phases: 1, tasks: 4, gates: 0, expected: 'Simple' },
  { code: 'starter_wbs_v1', phases: 3, tasks: 12, gates: 0, expected: 'Standard' },
  { code: 'startup_gtm_v1', phases: 4, tasks: 6, gates: 0, expected: 'Standard' },
  { code: 'startup_mvp_build_v1', phases: 4, tasks: 5, gates: 0, expected: 'Standard' },
  { code: 'sw_kanban_delivery_v1', phases: 1, tasks: 7, gates: 0, expected: 'Simple' },
  { code: 'sw_release_planning_v1', phases: 5, tasks: 7, gates: 1, expected: 'Standard' },
  { code: 'sw_scrum_delivery_v1', phases: 1, tasks: 10, gates: 0, expected: 'Simple' },
];

function fixtureFromCensus(row: CensusRow) {
  const phases = Array.from({ length: row.phases }, (_, i) => ({
    name: `Phase ${i + 1}`,
    order: i,
    gateKey:
      i < row.gates
        ? ([
            'platform.gate.init-to-plan',
            'platform.gate.plan-to-exec',
            'platform.gate.exec-to-monitor',
            'platform.gate.monitor-to-closure',
            'platform.gate.closure-to-closed',
          ][i] as string)
        : undefined,
    docKeys: i === 0 ? ['getting-started-guide'] : undefined,
  }));
  const task_templates = Array.from({ length: row.tasks }, (_, i) => ({
    name: `Task ${i + 1}`,
    phaseOrder: 0,
  }));
  return mapTemplateDto({
    id: row.code,
    name: row.code,
    kind: 'project',
    template_scope: 'SYSTEM',
    template_code: row.code,
    // Editorial seed — must NOT override derivation
    metadata: { setup: 'Advanced', purpose: 'seeded lie' },
    phases,
    task_templates,
    is_active: true,
    is_default: false,
    is_system: true,
    lock_state: 'UNLOCKED',
    version: 1,
    created_at: '',
    updated_at: '',
    default_enabled_kpis: [],
  });
}

describe('TEMPLATE-UX-1 — FlatPhase mapper pass-through', () => {
  it('maps gateKey, reportingKey, and docKeys onto FlatPhase', () => {
    const dto = mapTemplateDto({
      id: '1',
      name: 'Waterfall',
      kind: 'project',
      template_scope: 'SYSTEM',
      phases: [
        {
          name: 'Initiation',
          order: 0,
          gate_key: 'platform.gate.init-to-plan',
          reporting_key: 'INIT',
          doc_keys: ['getting-started-guide', 'project-charter'],
        },
      ],
      is_active: true,
      is_default: false,
      is_system: true,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(dto.phases?.[0]).toMatchObject({
      name: 'Initiation',
      gateKey: 'platform.gate.init-to-plan',
      reportingKey: 'INIT',
      docKeys: ['getting-started-guide', 'project-charter'],
    });
  });
});

describe('TEMPLATE-UX-1 — derived setup formula (census fixture)', () => {
  it('covers all 16 active templates', () => {
    expect(CENSUS_16).toHaveLength(16);
  });

  it.each(CENSUS_16)(
    '$code → $expected (P=$phases T=$tasks G=$gates)',
    (row) => {
      const tpl = fixtureFromCensus(row);
      expect(deriveSetupLevel(tpl)).toBe(row.expected);
      // resolveSetupBadge must NOT honor metadata.setup
      expect(resolveSetupBadge(tpl)).toBe(row.expected);
      expect(hasGettingStartedGuide(tpl)).toBe(true);
    },
  );

  it('ignores metadata.setup even when seeded Advanced on a Simple structure', () => {
    const tpl = fixtureFromCensus(CENSUS_16.find((r) => r.code === 'sw_scrum_delivery_v1')!);
    expect((tpl.metadata as { setup: string }).setup).toBe('Advanced');
    expect(deriveSetupLevel(tpl)).toBe('Simple');
  });

  it('retires Rich from the setup level type and mapper', () => {
    const src = readFileSync(MAPPER, 'utf8');
    expect(src).not.toMatch(/'Rich'/);
    expect(src).toMatch(/TemplateSetupLevel = 'Simple' \| 'Standard' \| 'Advanced'/);
  });
});

describe('TEMPLATE-UX-1 — card and preview share deriveSetupLevel', () => {
  it('preview modal no longer synthesizes counts-only setup labels', () => {
    const src = readFileSync(PREVIEW, 'utf8');
    expect(src).not.toMatch(/function previewSetupLabel/);
    expect(src).toMatch(/deriveSetupLevel\(template\)/);
  });

  it('center card uses deriveSetupLevel (not metadata.setup override)', () => {
    const src = readFileSync(CENTER, 'utf8');
    expect(src).toMatch(/deriveSetupLevel/);
    expect(src).not.toMatch(/resolveSetupBadge/);
  });
});

describe('TEMPLATE-UX-1 — getting started footer link', () => {
  it('card and preview expose getting-started affordances', () => {
    const center = readFileSync(CENTER, 'utf8');
    const preview = readFileSync(PREVIEW, 'utf8');
    expect(center).toMatch(/template-getting-started-/);
    expect(center).toMatch(/openGettingStartedGuide/);
    expect(center).toMatch(/GETTING_STARTED_DOC_KEY/);
    expect(center).toMatch(/setFocusDocKey/);
    expect(center).not.toMatch(/setSearch\('Getting Started'\)/);
    expect(preview).toMatch(/template-preview-getting-started/);
    expect(preview).toMatch(/onOpenGettingStarted/);
  });
});

describe('TEMPLATE-UX-1 — process map', () => {
  it('renders gate icons from list payload and hides when use_gates false', () => {
    const src = readFileSync(PROCESS_MAP, 'utf8');
    expect(src).toMatch(/template-process-map/);
    expect(src).toMatch(/templateGatesArmed/);
    expect(src).toMatch(/gateLabel/);
  });

  it('FE constant covers the five canonical phase-transition keys', () => {
    expect(Object.keys(CANONICAL_PHASE_GATE_LABELS)).toHaveLength(5);
    expect(gateLabel('platform.gate.plan-to-exec')).toBe('Planning → Execution');
  });

  it('templateGatesArmed respects use_gates:false', () => {
    const armed = mapTemplateDto({
      id: '1',
      name: 'A',
      kind: 'project',
      template_scope: 'ORG',
      capabilities: { use_gates: false },
      phases: [{ name: 'P', order: 0, gateKey: 'platform.gate.plan-to-exec' }],
      is_active: true,
      is_default: false,
      is_system: false,
      lock_state: 'UNLOCKED',
      version: 1,
      created_at: '',
      updated_at: '',
      default_enabled_kpis: [],
    });
    expect(templateGatesArmed(armed)).toBe(false);
  });
});
