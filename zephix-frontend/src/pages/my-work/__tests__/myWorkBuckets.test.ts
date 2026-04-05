import { describe, it, expect } from 'vitest';
import {
  assignOpenBucket,
  localYmd,
  isOpenItem,
  OPEN_BUCKET_ORDER,
} from '../myWorkBuckets';

describe('myWorkBuckets', () => {
  const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

  it('isOpenItem excludes done', () => {
    expect(isOpenItem({ status: 'done' })).toBe(false);
    expect(isOpenItem({ status: 'todo' })).toBe(true);
  });

  it('assignOpenBucket: unscheduled when no due date', () => {
    const now = noon(2026, 4, 10);
    expect(assignOpenBucket({ status: 'todo', dueDate: null }, now)).toBe('unscheduled');
    expect(assignOpenBucket({ status: 'todo' }, now)).toBe('unscheduled');
  });

  it('assignOpenBucket: overdue before today (local calendar)', () => {
    const now = noon(2026, 4, 10);
    expect(assignOpenBucket({ status: 'todo', dueDate: noon(2026, 4, 9).toISOString() }, now)).toBe(
      'overdue',
    );
  });

  it('assignOpenBucket: today', () => {
    const now = noon(2026, 4, 10);
    expect(assignOpenBucket({ status: 'todo', dueDate: noon(2026, 4, 10).toISOString() }, now)).toBe(
      'today',
    );
  });

  it('assignOpenBucket: next7 for any due date after today', () => {
    const now = noon(2026, 4, 10);
    expect(assignOpenBucket({ status: 'todo', dueDate: noon(2026, 4, 11).toISOString() }, now)).toBe(
      'next7',
    );
    expect(assignOpenBucket({ status: 'todo', dueDate: noon(2026, 6, 1).toISOString() }, now)).toBe(
      'next7',
    );
  });

  it('assignOpenBucket throws for done items', () => {
    expect(() => assignOpenBucket({ status: 'done', dueDate: null })).toThrow();
  });

  it('OPEN_BUCKET_ORDER has four unique keys', () => {
    expect(OPEN_BUCKET_ORDER).toEqual(['overdue', 'today', 'next7', 'unscheduled']);
    expect(new Set(OPEN_BUCKET_ORDER).size).toBe(4);
  });

  it('localYmd is stable for same calendar day', () => {
    const a = new Date(2026, 3, 4, 1, 0, 0);
    const b = new Date(2026, 3, 4, 23, 59, 0);
    expect(localYmd(a)).toBe(localYmd(b));
    expect(localYmd(a)).toBe('2026-04-04');
  });
});
