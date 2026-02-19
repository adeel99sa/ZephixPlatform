import { BadRequestException } from '@nestjs/common';
import { MethodologyConfigValidatorService } from '../services/methodology-config-validator.service';
import { METHODOLOGY_PRESETS } from '../constants/methodology-presets';
import {
  EstimationType,
  LifecycleType,
  MethodologyCode,
  MethodologyConfig,
  WipEnforcement,
} from '../interfaces/methodology-config.interface';

describe('MethodologyConfigValidatorService', () => {
  let service: MethodologyConfigValidatorService;

  beforeEach(() => {
    service = new MethodologyConfigValidatorService();
  });

  describe('validate — all presets pass', () => {
    for (const [code, preset] of Object.entries(METHODOLOGY_PRESETS)) {
      it(`${code} preset is valid`, () => {
        const errors = service.validate(preset.config);
        expect(errors).toEqual([]);
      });
    }
  });

  describe('validate — structure errors', () => {
    it('rejects invalid lifecycleType', () => {
      const config = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        lifecycleType: 'invalid' as any,
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'lifecycleType' }),
      );
    });

    it('rejects missing sprint.enabled', () => {
      const config = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        sprint: {} as any,
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'sprint.enabled' }),
      );
    });

    it('rejects sprint.defaultLengthDays > 90', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        sprint: { enabled: true, defaultLengthDays: 100 },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'sprint.defaultLengthDays' }),
      );
    });

    it('rejects empty tabs', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ui: { tabs: [] },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'ui.tabs' }),
      );
    });

    it('rejects invalid tab names', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ui: { tabs: ['overview', 'invalid_tab'] },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'ui.tabs',
          constraint: 'valid_values',
        }),
      );
    });

    it('rejects WIP defaultLimit > 100', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.KANBAN].config,
        wip: {
          enabled: true,
          enforcement: WipEnforcement.BLOCK,
          defaultLimit: 200,
          perStatusLimits: null,
        },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'wip.defaultLimit' }),
      );
    });
  });

  describe('validate — data-integrity consistency', () => {
    it('requires iterationsEnabled when sprint enabled', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        governance: {
          ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config.governance,
          iterationsEnabled: false,
        },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'governance.iterationsEnabled',
          constraint: 'consistency',
        }),
      );
    });

    it('requires waterfallEnabled when gateRequired', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
        governance: {
          ...METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config.governance,
          waterfallEnabled: false,
        },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'governance.waterfallEnabled',
          constraint: 'consistency',
        }),
      );
    });

    it('requires costTracking when earnedValue enabled', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.AGILE].config,
        governance: {
          ...METHODOLOGY_PRESETS[MethodologyCode.AGILE].config.governance,
          earnedValueEnabled: true,
          costTrackingEnabled: false,
        },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'governance.costTrackingEnabled',
          constraint: 'consistency',
        }),
      );
    });

    it('requires overview tab', () => {
      const config: MethodologyConfig = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ui: { tabs: ['tasks', 'board'] },
      };
      const errors = service.validate(config);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'ui.tabs',
          constraint: 'required_tab',
        }),
      );
    });
  });

  describe('validateOrThrow', () => {
    it('does not throw for valid config', () => {
      expect(() =>
        service.validateOrThrow(
          METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ),
      ).not.toThrow();
    });

    it('throws BadRequestException for invalid config', () => {
      const config = {
        ...METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        lifecycleType: 'bad' as any,
      };
      expect(() => service.validateOrThrow(config)).toThrow(
        BadRequestException,
      );
    });
  });
});
