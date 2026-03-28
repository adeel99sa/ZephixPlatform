/**
 * Phase 2C: Baseline lock enforcement guard test.
 * Validates that locked baselines cannot be mutated.
 */
import { BaselineService } from '../baseline.service';
import { ForbiddenException } from '@nestjs/common';
import { ScheduleBaseline } from '../../entities/schedule-baseline.entity';

describe('BaselineService — Lock Enforcement', () => {
  let service: BaselineService;

  beforeAll(() => {
    service = new BaselineService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    );
  });

  it('throws ForbiddenException with BASELINE_LOCKED code when baseline is locked', () => {
    const baseline = {
      id: 'bl-1',
      locked: true,
      name: 'Test Baseline',
    } as ScheduleBaseline;

    try {
      service.assertNotLocked(baseline);
      fail('Expected ForbiddenException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const response = err.getResponse();
      expect(response.code).toBe('BASELINE_LOCKED');
      expect(response.message).toBe('Baseline is immutable once captured');
    }
  });

  it('does NOT throw when baseline is not locked', () => {
    const baseline = {
      id: 'bl-2',
      locked: false,
      name: 'Unlocked Baseline',
    } as ScheduleBaseline;

    expect(() => service.assertNotLocked(baseline)).not.toThrow();
  });

  it('returns 403 status code for locked baseline', () => {
    const baseline = {
      id: 'bl-3',
      locked: true,
      name: 'Locked One',
    } as ScheduleBaseline;

    try {
      service.assertNotLocked(baseline);
    } catch (err: any) {
      expect(err.getStatus()).toBe(403);
    }
  });
});
