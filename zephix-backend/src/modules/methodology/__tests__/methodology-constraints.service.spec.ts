import { ForbiddenException } from '@nestjs/common';
import { MethodologyConstraintsService } from '../services/methodology-constraints.service';
import { METHODOLOGY_PRESETS } from '../constants/methodology-presets';
import { MethodologyCode } from '../interfaces/methodology-config.interface';

describe('MethodologyConstraintsService', () => {
  let service: MethodologyConstraintsService;

  beforeEach(() => {
    service = new MethodologyConstraintsService();
  });

  describe('assertSprintEnabled', () => {
    it('allows when sprint enabled (scrum)', () => {
      expect(() =>
        service.assertSprintEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ),
      ).not.toThrow();
    });

    it('blocks when sprint disabled (kanban)', () => {
      expect(() =>
        service.assertSprintEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.KANBAN].config,
        ),
      ).toThrow(ForbiddenException);
    });

    it('blocks when sprint disabled (waterfall)', () => {
      expect(() =>
        service.assertSprintEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows null config (permissive for backfilled projects)', () => {
      expect(() => service.assertSprintEnabled(null)).not.toThrow();
    });
  });

  describe('assertPhaseGateApproved', () => {
    it('blocks when gate required but not approved (waterfall)', () => {
      expect(() =>
        service.assertPhaseGateApproved(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
          false,
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows when gate required and approved', () => {
      expect(() =>
        service.assertPhaseGateApproved(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
          true,
        ),
      ).not.toThrow();
    });

    it('allows when gate not required (scrum)', () => {
      expect(() =>
        service.assertPhaseGateApproved(
          METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
          false,
        ),
      ).not.toThrow();
    });
  });

  describe('assertCostTrackingEnabled', () => {
    it('allows when cost tracking enabled (waterfall)', () => {
      expect(() =>
        service.assertCostTrackingEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
        ),
      ).not.toThrow();
    });

    it('blocks when cost tracking disabled (scrum)', () => {
      expect(() =>
        service.assertCostTrackingEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertBaselinesEnabled', () => {
    it('allows when baselines enabled (waterfall)', () => {
      expect(() =>
        service.assertBaselinesEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
        ),
      ).not.toThrow();
    });

    it('blocks when baselines disabled (kanban)', () => {
      expect(() =>
        service.assertBaselinesEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.KANBAN].config,
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertChangeControlEnabled', () => {
    it('allows when change management enabled (waterfall)', () => {
      expect(() =>
        service.assertChangeControlEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
        ),
      ).not.toThrow();
    });

    it('blocks when change management disabled (scrum)', () => {
      expect(() =>
        service.assertChangeControlEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.SCRUM].config,
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertEarnedValueEnabled', () => {
    it('allows when EV enabled (waterfall)', () => {
      expect(() =>
        service.assertEarnedValueEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.WATERFALL].config,
        ),
      ).not.toThrow();
    });

    it('blocks when EV disabled (agile)', () => {
      expect(() =>
        service.assertEarnedValueEnabled(
          METHODOLOGY_PRESETS[MethodologyCode.AGILE].config,
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
