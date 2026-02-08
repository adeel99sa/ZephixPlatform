import {
  countWorkdays,
  dateOverlap,
  computeAllocatedHours,
  computeLoadFromPoints,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_HOURS_PER_POINT,
} from '../utils/sprint-capacity.utils';

describe('countWorkdays', () => {
  it('counts Mon-Fri for a standard 2-week sprint', () => {
    // Mon 2026-03-02 to Fri 2026-03-13 = 10 workdays
    const start = new Date('2026-03-02');
    const end = new Date('2026-03-13');
    expect(countWorkdays(start, end)).toBe(10);
  });

  it('returns 0 when end is before start', () => {
    expect(countWorkdays(new Date('2026-03-10'), new Date('2026-03-01'))).toBe(0);
  });

  it('returns 1 for a single weekday', () => {
    const mon = new Date('2026-03-02'); // Monday
    expect(countWorkdays(mon, mon)).toBe(1);
  });

  it('returns 0 for a single Saturday', () => {
    const sat = new Date('2026-03-07'); // Saturday
    expect(countWorkdays(sat, sat)).toBe(0);
  });

  it('returns 0 for a single Sunday', () => {
    const sun = new Date('2026-03-08'); // Sunday
    expect(countWorkdays(sun, sun)).toBe(0);
  });

  it('counts correctly for a Sat-Sun range', () => {
    expect(countWorkdays(new Date('2026-03-07'), new Date('2026-03-08'))).toBe(0);
  });

  it('handles a 1-week sprint Mon-Fri', () => {
    expect(countWorkdays(new Date('2026-03-02'), new Date('2026-03-06'))).toBe(5);
  });

  it('handles sprint starting mid-week (Wed-Tue)', () => {
    // Wed 2026-03-04 to Tue 2026-03-10 = Wed,Thu,Fri + Mon,Tue = 5
    expect(countWorkdays(new Date('2026-03-04'), new Date('2026-03-10'))).toBe(5);
  });
});

describe('dateOverlap', () => {
  it('returns overlap for partially overlapping ranges', () => {
    const result = dateOverlap(
      new Date('2026-03-01'), new Date('2026-03-15'),
      new Date('2026-03-10'), new Date('2026-03-20'),
    );
    expect(result).not.toBeNull();
    expect(result!.start.toISOString().slice(0, 10)).toBe('2026-03-10');
    expect(result!.end.toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('returns null for non-overlapping ranges', () => {
    const result = dateOverlap(
      new Date('2026-03-01'), new Date('2026-03-10'),
      new Date('2026-03-11'), new Date('2026-03-20'),
    );
    expect(result).toBeNull();
  });

  it('returns single day for ranges touching on one day', () => {
    const result = dateOverlap(
      new Date('2026-03-01'), new Date('2026-03-10'),
      new Date('2026-03-10'), new Date('2026-03-20'),
    );
    expect(result).not.toBeNull();
    expect(result!.start.toISOString().slice(0, 10)).toBe('2026-03-10');
    expect(result!.end.toISOString().slice(0, 10)).toBe('2026-03-10');
  });

  it('returns full inner range when one contains the other', () => {
    const result = dateOverlap(
      new Date('2026-03-01'), new Date('2026-03-31'),
      new Date('2026-03-10'), new Date('2026-03-20'),
    );
    expect(result).not.toBeNull();
    expect(result!.start.toISOString().slice(0, 10)).toBe('2026-03-10');
    expect(result!.end.toISOString().slice(0, 10)).toBe('2026-03-20');
  });
});

describe('computeAllocatedHours', () => {
  const sprintStart = new Date('2026-03-02'); // Monday
  const sprintEnd = new Date('2026-03-13'); // Friday (10 workdays)

  it('computes full allocation for one person at 100%', () => {
    const hours = computeAllocatedHours(sprintStart, sprintEnd, [
      { allocationPercent: 100, startDate: null, endDate: null },
    ]);
    // 10 workdays × 8 hours × 100% = 80
    expect(hours).toBe(80);
  });

  it('computes half allocation at 50%', () => {
    const hours = computeAllocatedHours(sprintStart, sprintEnd, [
      { allocationPercent: 50, startDate: null, endDate: null },
    ]);
    // 10 × 8 × 0.5 = 40
    expect(hours).toBe(40);
  });

  it('sums multiple allocations', () => {
    const hours = computeAllocatedHours(sprintStart, sprintEnd, [
      { allocationPercent: 100, startDate: null, endDate: null },
      { allocationPercent: 50, startDate: null, endDate: null },
    ]);
    // 80 + 40 = 120
    expect(hours).toBe(120);
  });

  it('handles partial overlap (allocation starts mid-sprint)', () => {
    const hours = computeAllocatedHours(sprintStart, sprintEnd, [
      {
        allocationPercent: 100,
        startDate: new Date('2026-03-09'), // Monday of week 2
        endDate: null,
      },
    ]);
    // Mon-Fri week 2 = 5 workdays × 8 = 40
    expect(hours).toBe(40);
  });

  it('returns 0 for zero allocations', () => {
    expect(computeAllocatedHours(sprintStart, sprintEnd, [])).toBe(0);
  });

  it('returns 0 for allocation that does not overlap sprint', () => {
    const hours = computeAllocatedHours(sprintStart, sprintEnd, [
      {
        allocationPercent: 100,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-15'),
      },
    ]);
    expect(hours).toBe(0);
  });

  it('uses custom hoursPerDay', () => {
    const hours = computeAllocatedHours(
      sprintStart, sprintEnd,
      [{ allocationPercent: 100, startDate: null, endDate: null }],
      6,
    );
    // 10 × 6 × 1.0 = 60
    expect(hours).toBe(60);
  });
});

describe('computeLoadFromPoints', () => {
  it('converts story points to hours using default ratio', () => {
    expect(computeLoadFromPoints(10)).toBe(10 * DEFAULT_HOURS_PER_POINT);
  });

  it('returns 0 for 0 points', () => {
    expect(computeLoadFromPoints(0)).toBe(0);
  });

  it('uses custom ratio', () => {
    expect(computeLoadFromPoints(10, 4)).toBe(40);
  });
});

describe('DEFAULT constants', () => {
  it('DEFAULT_HOURS_PER_DAY is 8', () => {
    expect(DEFAULT_HOURS_PER_DAY).toBe(8);
  });

  it('DEFAULT_HOURS_PER_POINT is 2', () => {
    expect(DEFAULT_HOURS_PER_POINT).toBe(2);
  });
});
