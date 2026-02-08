import { buildBurndownBuckets, type BurndownTask } from '../utils/burndown.utils';

describe('buildBurndownBuckets', () => {
  const sprintStart = new Date('2026-03-02'); // Monday
  const sprintEnd = new Date('2026-03-06'); // Friday (5 days)

  it('returns empty for 0 total points', () => {
    const result = buildBurndownBuckets(sprintStart, sprintEnd, []);
    expect(result).toEqual([]);
  });

  it('returns flat line when nothing is completed', () => {
    const tasks: BurndownTask[] = [
      { storyPoints: 10, completedAt: null, status: 'TODO' },
    ];
    const buckets = buildBurndownBuckets(sprintStart, sprintEnd, tasks);
    expect(buckets).toHaveLength(5);
    // All remaining = 10
    expect(buckets[0].remainingPoints).toBe(10);
    expect(buckets[4].remainingPoints).toBe(10);
    // Completed stays 0
    expect(buckets[4].completedPoints).toBe(0);
    // Total is consistent
    expect(buckets[0].totalPoints).toBe(10);
  });

  it('shows ideal line from totalPoints to 0', () => {
    const tasks: BurndownTask[] = [
      { storyPoints: 10, completedAt: null, status: 'TODO' },
    ];
    const buckets = buildBurndownBuckets(sprintStart, sprintEnd, tasks);
    // Day 0: ideal = 10, Day 4: ideal = 0
    expect(buckets[0].idealRemaining).toBe(10);
    expect(buckets[4].idealRemaining).toBe(0);
    // Midpoint: day 2 (index 2) = 10 * (1 - 2/4) = 5
    expect(buckets[2].idealRemaining).toBe(5);
  });

  it('tracks completions by day', () => {
    const tasks: BurndownTask[] = [
      { storyPoints: 5, completedAt: new Date('2026-03-03'), status: 'DONE' },
      { storyPoints: 3, completedAt: new Date('2026-03-05'), status: 'DONE' },
      { storyPoints: 2, completedAt: null, status: 'IN_PROGRESS' },
    ];
    const buckets = buildBurndownBuckets(sprintStart, sprintEnd, tasks);
    expect(buckets).toHaveLength(5);

    // Day 0 (Mar 2): 0 completed, 10 remaining
    expect(buckets[0].completedPoints).toBe(0);
    expect(buckets[0].remainingPoints).toBe(10);

    // Day 1 (Mar 3): 5 completed, 5 remaining
    expect(buckets[1].completedPoints).toBe(5);
    expect(buckets[1].remainingPoints).toBe(5);

    // Day 3 (Mar 5): 5+3=8 completed, 2 remaining
    expect(buckets[3].completedPoints).toBe(8);
    expect(buckets[3].remainingPoints).toBe(2);

    // Day 4 (Mar 6): still 8 completed (no more completions)
    expect(buckets[4].completedPoints).toBe(8);
    expect(buckets[4].remainingPoints).toBe(2);
  });

  it('handles all tasks completed on day 1', () => {
    const tasks: BurndownTask[] = [
      { storyPoints: 3, completedAt: new Date('2026-03-02'), status: 'DONE' },
      { storyPoints: 5, completedAt: new Date('2026-03-02'), status: 'DONE' },
    ];
    const buckets = buildBurndownBuckets(sprintStart, sprintEnd, tasks);
    expect(buckets[0].completedPoints).toBe(8);
    expect(buckets[0].remainingPoints).toBe(0);
    expect(buckets[4].remainingPoints).toBe(0);
  });

  it('includes dates as YYYY-MM-DD strings', () => {
    const tasks: BurndownTask[] = [
      { storyPoints: 1, completedAt: null, status: 'TODO' },
    ];
    const buckets = buildBurndownBuckets(sprintStart, sprintEnd, tasks);
    expect(buckets[0].date).toBe('2026-03-02');
    expect(buckets[4].date).toBe('2026-03-06');
  });

  it('handles end before start', () => {
    const result = buildBurndownBuckets(sprintEnd, sprintStart, [
      { storyPoints: 5, completedAt: null, status: 'TODO' },
    ]);
    expect(result).toEqual([]);
  });

  it('handles single-day sprint', () => {
    const day = new Date('2026-03-02');
    const tasks: BurndownTask[] = [
      { storyPoints: 3, completedAt: new Date('2026-03-02'), status: 'DONE' },
    ];
    const buckets = buildBurndownBuckets(day, day, tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].completedPoints).toBe(3);
    expect(buckets[0].remainingPoints).toBe(0);
    expect(buckets[0].idealRemaining).toBe(0);
  });
});
