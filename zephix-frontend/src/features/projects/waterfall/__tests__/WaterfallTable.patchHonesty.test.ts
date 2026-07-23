/**
 * FE-HONESTY-1 T5 — patchTask must not call loadAll() on failure.
 * Targeted revert + row reason replace a full reload that hid which row failed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SOURCE_PATH = join(__dirname, '..', 'WaterfallTable.tsx');

describe('FE-HONESTY-1 T5 — WaterfallTable.patchTask honesty', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8');

  it('patchTask catch path does not call loadAll()', () => {
    const start = source.indexOf('const patchTask = useCallback');
    const end = source.indexOf('const handleSprintReassign');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const patchTaskBody = source.slice(start, end);

    expect(patchTaskBody).not.toMatch(/await\s+loadAll\s*\(/);
    expect(patchTaskBody).toMatch(/patchRollbackRef/);
    expect(patchTaskBody).toMatch(/setStatusActionErrors/);
    expect(patchTaskBody).toMatch(/never loadAll/);
  });

  it('status cell renders pending + inline error test ids', () => {
    expect(source).toMatch(/waterfall-status-pending-\$\{task\.id\}/);
    expect(source).toMatch(/waterfall-status-error-\$\{task\.id\}/);
  });
});
