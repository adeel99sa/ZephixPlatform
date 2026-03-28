import { findSequentialNextPhase } from './gate-decision-resolution';

describe('findSequentialNextPhase', () => {
  it('returns the next higher sortOrder phase', () => {
    const phases = [
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
      { id: 'c', sortOrder: 3 },
    ];
    expect(findSequentialNextPhase(phases, 'a')?.id).toBe('b');
    expect(findSequentialNextPhase(phases, 'b')?.id).toBe('c');
  });

  it('returns null when no later phase exists', () => {
    const phases = [
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ];
    expect(findSequentialNextPhase(phases, 'b')).toBeNull();
  });

  it('returns null when current id is unknown', () => {
    expect(findSequentialNextPhase([{ id: 'a', sortOrder: 1 }], 'x')).toBeNull();
  });
});
