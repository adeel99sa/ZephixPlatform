import { MethodologyConfigResolverService } from '../services/methodology-config-resolver.service';
import {
  LifecycleType,
  MethodologyCode,
  WipEnforcement,
} from '../interfaces/methodology-config.interface';

describe('MethodologyConfigResolverService', () => {
  let service: MethodologyConfigResolverService;

  beforeEach(() => {
    service = new MethodologyConfigResolverService();
  });

  describe('getPreset', () => {
    it('returns scrum preset', () => {
      const config = service.getPreset(MethodologyCode.SCRUM);
      expect(config.lifecycleType).toBe(LifecycleType.ITERATIVE);
      expect(config.sprint.enabled).toBe(true);
      expect(config.governance.iterationsEnabled).toBe(true);
    });

    it('returns kanban preset', () => {
      const config = service.getPreset(MethodologyCode.KANBAN);
      expect(config.lifecycleType).toBe(LifecycleType.FLOW);
      expect(config.sprint.enabled).toBe(false);
      expect(config.wip.enabled).toBe(true);
      expect(config.wip.enforcement).toBe(WipEnforcement.BLOCK);
    });

    it('returns waterfall preset', () => {
      const config = service.getPreset(MethodologyCode.WATERFALL);
      expect(config.lifecycleType).toBe(LifecycleType.PHASED);
      expect(config.phases.gateRequired).toBe(true);
      expect(config.governance.earnedValueEnabled).toBe(true);
    });

    it('falls back to agile for unknown code', () => {
      const config = service.getPreset('unknown' as any);
      expect(config.lifecycleType).toBe(LifecycleType.FLEXIBLE);
      expect(config.methodologyCode).toBe(MethodologyCode.AGILE);
    });

    it('returns independent copies', () => {
      const a = service.getPreset(MethodologyCode.SCRUM);
      const b = service.getPreset(MethodologyCode.SCRUM);
      a.sprint.defaultLengthDays = 999;
      expect(b.sprint.defaultLengthDays).toBe(14);
    });
  });

  describe('resolve', () => {
    it('returns preset when no overrides', () => {
      const config = service.resolve(MethodologyCode.SCRUM);
      expect(config.sprint.enabled).toBe(true);
      expect(config.sprint.defaultLengthDays).toBe(14);
    });

    it('applies overrides', () => {
      const config = service.resolve(MethodologyCode.SCRUM, {
        sprint: { enabled: true, defaultLengthDays: 21 },
      });
      expect(config.sprint.defaultLengthDays).toBe(21);
    });

    it('org admin CAN disable sprints on Scrum (no label locks)', () => {
      const config = service.resolve(MethodologyCode.SCRUM, {
        sprint: { enabled: false, defaultLengthDays: 14 },
      });
      expect(config.sprint.enabled).toBe(false);
    });

    it('org admin CAN enable sprints on Kanban (no label locks)', () => {
      const config = service.resolve(MethodologyCode.KANBAN, {
        sprint: { enabled: true, defaultLengthDays: 14 },
      });
      expect(config.sprint.enabled).toBe(true);
    });

    it('org admin CAN disable gates on Waterfall (no label locks)', () => {
      const config = service.resolve(MethodologyCode.WATERFALL, {
        phases: { gateRequired: false, minPhases: 1, minGates: 0 },
      });
      expect(config.phases.gateRequired).toBe(false);
    });

    it('preserves identity fields', () => {
      const config = service.resolve(MethodologyCode.SCRUM, {
        methodologyCode: 'kanban' as any,
        lifecycleType: 'flow' as any,
      });
      expect(config.methodologyCode).toBe(MethodologyCode.SCRUM);
      expect(config.lifecycleType).toBe(LifecycleType.ITERATIVE);
    });

    it('allows arbitrary overrides on Hybrid', () => {
      const config = service.resolve(MethodologyCode.HYBRID, {
        sprint: { enabled: false, defaultLengthDays: 7 },
        wip: {
          enabled: true,
          enforcement: WipEnforcement.WARN,
          defaultLimit: 10,
          perStatusLimits: null,
        },
      });
      expect(config.sprint.enabled).toBe(false);
      expect(config.wip.enabled).toBe(true);
      expect(config.wip.defaultLimit).toBe(10);
    });
  });

  describe('buildFromExistingFlags', () => {
    it('mirrors existing project flags permissively', () => {
      const config = service.buildFromExistingFlags({
        methodology: 'scrum',
        iterationsEnabled: true,
        costTrackingEnabled: false,
        baselinesEnabled: false,
        earnedValueEnabled: false,
        capacityEnabled: false,
        changeManagementEnabled: false,
        waterfallEnabled: false,
        estimationMode: 'story_points',
        defaultIterationLengthDays: 21,
      });

      expect(config.methodologyCode).toBe(MethodologyCode.SCRUM);
      expect(config.sprint.enabled).toBe(true);
      expect(config.sprint.defaultLengthDays).toBe(21);
      expect(config.estimation.type).toBe('points');
      expect(config.governance.iterationsEnabled).toBe(true);
      expect(config.governance.costTrackingEnabled).toBe(false);
      expect(config.ui.tabs).toContain('overview');
      expect(config.ui.tabs).toContain('sprints');
      expect(config.ui.tabs.length).toBe(12);
    });

    it('handles null methodology as agile', () => {
      const config = service.buildFromExistingFlags({});
      expect(config.methodologyCode).toBe(MethodologyCode.AGILE);
      expect(config.lifecycleType).toBe(LifecycleType.FLEXIBLE);
    });

    it('handles waterfall project with existing flags', () => {
      const config = service.buildFromExistingFlags({
        methodology: 'waterfall',
        iterationsEnabled: false,
        costTrackingEnabled: true,
        baselinesEnabled: true,
        earnedValueEnabled: true,
        waterfallEnabled: true,
      });

      expect(config.methodologyCode).toBe(MethodologyCode.WATERFALL);
      expect(config.sprint.enabled).toBe(false);
      expect(config.governance.costTrackingEnabled).toBe(true);
      expect(config.governance.earnedValueEnabled).toBe(true);
    });
  });
});
