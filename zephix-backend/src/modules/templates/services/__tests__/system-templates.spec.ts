/**
 * Wave 7: System template library integrity tests.
 * 12 templates, 3 per delivery method, governance-aligned KPI packs.
 * Pure unit tests — no DB required.
 */

import { KPI_PACKS } from '../../../kpis/engine/kpi-packs';
import { KPI_REGISTRY_DEFAULTS } from '../../../kpis/engine/kpi-registry-defaults';
import {
  VALID_TAB_IDS,
  VALID_DELIVERY_METHODS,
  VALID_GOVERNANCE_FLAGS,
} from '../../constants/template-defaults';
import { SYSTEM_TEMPLATE_DEFS as SYSTEM_TEMPLATES } from '../../data/system-template-definitions';

const VALID_TABS = [...VALID_TAB_IDS];
const VALID_GOV_FLAGS = [...VALID_GOVERNANCE_FLAGS];
const VALID_METHODS = [...VALID_DELIVERY_METHODS];

describe('Wave 7: System Template Library (12 templates)', () => {
  // ── Cardinality ────────────────────────────────────────────────────

  it('defines exactly 12 system templates', () => {
    expect(SYSTEM_TEMPLATES).toHaveLength(12);
  });

  it('has 3 templates per delivery method', () => {
    for (const method of VALID_METHODS) {
      const count = SYSTEM_TEMPLATES.filter(t => t.deliveryMethod === method).length;
      expect(count).toBe(3);
    }
  });

  // ── Uniqueness ─────────────────────────────────────────────────────

  it('each template has a unique code', () => {
    const codes = SYSTEM_TEMPLATES.map(t => t.code);
    expect(new Set(codes).size).toBe(12);
  });

  it('each template has a unique name', () => {
    const names = SYSTEM_TEMPLATES.map(t => t.name);
    expect(new Set(names).size).toBe(12);
  });

  // ── Delivery method validity ───────────────────────────────────────

  it('every template uses a valid delivery method', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(VALID_METHODS).toContain(tpl.deliveryMethod);
    }
  });

  // ── Pack validity ──────────────────────────────────────────────────

  it('each template references a valid KPI pack', () => {
    const packCodes = KPI_PACKS.map(p => p.packCode);
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(packCodes).toContain(tpl.packCode);
    }
  });

  it('each pack code maps to existing KPI definitions only', () => {
    const registryCodes = new Set(KPI_REGISTRY_DEFAULTS.map(d => d.code));

    for (const tpl of SYSTEM_TEMPLATES) {
      const pack = KPI_PACKS.find(p => p.packCode === tpl.packCode);
      expect(pack).toBeDefined();

      for (const binding of pack!.bindings) {
        expect(registryCodes.has(binding.kpiCode)).toBe(true);
      }
    }
  });

  // ── Tab ID validity ────────────────────────────────────────────────

  it('every template only references valid tab IDs', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      for (const tab of tpl.defaultTabs) {
        expect(VALID_TABS).toContain(tab);
      }
    }
  });

  it('every template includes overview and kpis tabs', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(tpl.defaultTabs).toContain('overview');
      expect(tpl.defaultTabs).toContain('kpis');
    }
  });

  // ── Governance flag validity ───────────────────────────────────────

  it('every template only sets valid governance flag keys', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      for (const key of Object.keys(tpl.defaultGovernanceFlags)) {
        expect(VALID_GOV_FLAGS).toContain(key);
      }
    }
  });

  it('every template sets all 7 governance flags', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(Object.keys(tpl.defaultGovernanceFlags).sort()).toEqual(
        [...VALID_GOV_FLAGS].sort(),
      );
    }
  });

  // ── Structure integrity ────────────────────────────────────────────

  it('every template has at least 1 phase', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(tpl.phases.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('phases have sequential order starting from 0', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      const orders = tpl.phases.map(p => p.order).sort((a, b) => a - b);
      expect(orders[0]).toBe(0);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBe(orders[i - 1] + 1);
      }
    }
  });

  it('every template has at least 1 task template', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(tpl.taskTemplates.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('task template phaseOrder values are within range of defined phases', () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      const maxOrder = Math.max(...tpl.phases.map(p => p.order));
      for (const task of tpl.taskTemplates) {
        expect(task.phaseOrder).toBeGreaterThanOrEqual(0);
        expect(task.phaseOrder).toBeLessThanOrEqual(maxOrder);
      }
    }
  });

  // ── Method-specific governance rules ───────────────────────────────

  describe('SCRUM templates governance', () => {
    const scrumTemplates = SYSTEM_TEMPLATES.filter(t => t.deliveryMethod === 'SCRUM');

    it('all SCRUM templates enable iterationsEnabled', () => {
      for (const tpl of scrumTemplates) {
        expect(tpl.defaultGovernanceFlags.iterationsEnabled).toBe(true);
      }
    });

    it('all SCRUM templates disable baselines and costTracking', () => {
      for (const tpl of scrumTemplates) {
        expect(tpl.defaultGovernanceFlags.baselinesEnabled).toBe(false);
        expect(tpl.defaultGovernanceFlags.costTrackingEnabled).toBe(false);
      }
    });
  });

  describe('KANBAN templates governance', () => {
    const kanbanTemplates = SYSTEM_TEMPLATES.filter(t => t.deliveryMethod === 'KANBAN');

    it('all KANBAN templates disable iterations', () => {
      for (const tpl of kanbanTemplates) {
        expect(tpl.defaultGovernanceFlags.iterationsEnabled).toBe(false);
      }
    });

    it('all KANBAN templates enable capacity', () => {
      for (const tpl of kanbanTemplates) {
        expect(tpl.defaultGovernanceFlags.capacityEnabled).toBe(true);
      }
    });
  });

  describe('WATERFALL templates governance', () => {
    const waterfallTemplates = SYSTEM_TEMPLATES.filter(t => t.deliveryMethod === 'WATERFALL');

    it('all WATERFALL templates enable costTracking, baselines, and earnedValue', () => {
      for (const tpl of waterfallTemplates) {
        expect(tpl.defaultGovernanceFlags.costTrackingEnabled).toBe(true);
        expect(tpl.defaultGovernanceFlags.baselinesEnabled).toBe(true);
        expect(tpl.defaultGovernanceFlags.earnedValueEnabled).toBe(true);
      }
    });

    it('all WATERFALL templates enable changeManagement', () => {
      for (const tpl of waterfallTemplates) {
        expect(tpl.defaultGovernanceFlags.changeManagementEnabled).toBe(true);
      }
    });
  });

  describe('HYBRID templates governance', () => {
    const hybridTemplates = SYSTEM_TEMPLATES.filter(t => t.deliveryMethod === 'HYBRID');

    it('all HYBRID templates enable costTracking and changeManagement', () => {
      for (const tpl of hybridTemplates) {
        expect(tpl.defaultGovernanceFlags.costTrackingEnabled).toBe(true);
        expect(tpl.defaultGovernanceFlags.changeManagementEnabled).toBe(true);
      }
    });

    it('all HYBRID templates disable baselines', () => {
      for (const tpl of hybridTemplates) {
        expect(tpl.defaultGovernanceFlags.baselinesEnabled).toBe(false);
      }
    });
  });

  // ── Architect governance rules (non-negotiable) ────────────────────

  describe('governance alignment stop conditions', () => {
    const registryMap = new Map(KPI_REGISTRY_DEFAULTS.map(d => [d.code, d]));

    it('no template binds SPI or schedule_variance without baselinesEnabled', () => {
      for (const tpl of SYSTEM_TEMPLATES) {
        const pack = KPI_PACKS.find(p => p.packCode === tpl.packCode);
        if (!pack) continue;

        for (const binding of pack.bindings) {
          if (binding.kpiCode === 'spi' || binding.kpiCode === 'schedule_variance') {
            expect(tpl.defaultGovernanceFlags.baselinesEnabled).toBe(true);
          }
        }
      }
    });

    it('no template binds budget_burn or forecast_at_completion without costTrackingEnabled', () => {
      for (const tpl of SYSTEM_TEMPLATES) {
        const pack = KPI_PACKS.find(p => p.packCode === tpl.packCode);
        if (!pack) continue;

        for (const binding of pack.bindings) {
          if (binding.kpiCode === 'budget_burn' || binding.kpiCode === 'forecast_at_completion') {
            expect(tpl.defaultGovernanceFlags.costTrackingEnabled).toBe(true);
          }
        }
      }
    });

    it('no template binds change_request_approval_rate without changeManagementEnabled', () => {
      for (const tpl of SYSTEM_TEMPLATES) {
        const pack = KPI_PACKS.find(p => p.packCode === tpl.packCode);
        if (!pack) continue;

        for (const binding of pack.bindings) {
          if (binding.kpiCode === 'change_request_approval_rate') {
            expect(tpl.defaultGovernanceFlags.changeManagementEnabled).toBe(true);
          }
        }
      }
    });
  });

  // ── Generic pack-to-governance alignment (covers all KPIs) ─────────

  describe('KPI pack governance alignment (all KPIs)', () => {
    const registryMap = new Map(KPI_REGISTRY_DEFAULTS.map(d => [d.code, d]));

    for (const tpl of SYSTEM_TEMPLATES) {
      const pack = KPI_PACKS.find(p => p.packCode === tpl.packCode);
      if (!pack) continue;

      for (const binding of pack.bindings) {
        const def = registryMap.get(binding.kpiCode);
        if (!def?.requiredGovernanceFlag) continue;

        it(`${tpl.code} enables "${def.requiredGovernanceFlag}" for KPI "${binding.kpiCode}"`, () => {
          const flagValue = (tpl.defaultGovernanceFlags as Record<string, boolean>)[def!.requiredGovernanceFlag!];
          expect(flagValue).toBe(true);
        });
      }
    }
  });

  // ── Seed idempotency guard ─────────────────────────────────────────

  it('no duplicate names exist within system templates', () => {
    const names = SYSTEM_TEMPLATES.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('no duplicate codes exist within system templates', () => {
    const codes = SYSTEM_TEMPLATES.map(t => t.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});
