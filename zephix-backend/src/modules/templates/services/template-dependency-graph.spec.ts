/**
 * TC-C1b (F1) — cycle detection unit tests for the template dependency graph.
 */
import { hasDependencyCycle } from './template-dependency-graph';

const e = (predecessorId: string, successorId: string) => ({
  predecessorId,
  successorId,
});

describe('hasDependencyCycle', () => {
  it('returns false for an empty graph', () => {
    expect(hasDependencyCycle([])).toBe(false);
  });

  it('returns false for a simple chain a->b->c', () => {
    expect(hasDependencyCycle([e('a', 'b'), e('b', 'c')])).toBe(false);
  });

  it('returns false for a diamond a->b, a->c, b->d, c->d', () => {
    expect(
      hasDependencyCycle([e('a', 'b'), e('a', 'c'), e('b', 'd'), e('c', 'd')]),
    ).toBe(false);
  });

  it('detects a self-loop a->a', () => {
    expect(hasDependencyCycle([e('a', 'a')])).toBe(true);
  });

  it('detects a 2-cycle a->b->a', () => {
    expect(hasDependencyCycle([e('a', 'b'), e('b', 'a')])).toBe(true);
  });

  it('detects a 3-cycle a->b->c->a', () => {
    expect(
      hasDependencyCycle([e('a', 'b'), e('b', 'c'), e('c', 'a')]),
    ).toBe(true);
  });

  it('detects a cycle embedded in a larger acyclic-looking graph', () => {
    expect(
      hasDependencyCycle([
        e('root', 'a'),
        e('a', 'b'),
        e('b', 'c'),
        e('c', 'a'), // back-edge → cycle
        e('a', 'd'),
      ]),
    ).toBe(true);
  });
});
