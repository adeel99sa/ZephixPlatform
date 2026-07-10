import {
  canonicalizeMethodology,
  isCanonicalMethodology,
  CANONICAL_METHODOLOGIES,
} from './template-methodology';

/**
 * TC-B2 / AD-029 — canonical methodology mapping rules.
 */
describe('canonicalizeMethodology', () => {
  it('delivery_method wins when canonical (case-insensitive)', () => {
    expect(canonicalizeMethodology('agile', 'SCRUM')).toBe('scrum');
    expect(canonicalizeMethodology('anything', 'KANBAN')).toBe('kanban');
    expect(canonicalizeMethodology('waterfall', 'WATERFALL')).toBe('waterfall');
    expect(canonicalizeMethodology('hybrid', 'HYBRID')).toBe('hybrid');
  });

  it("folds bare 'agile' → 'scrum' (T6 merge) when no specific delivery_method", () => {
    expect(canonicalizeMethodology('agile', null)).toBe('scrum');
    expect(canonicalizeMethodology('agile', undefined)).toBe('scrum');
    expect(canonicalizeMethodology('Agile', '')).toBe('scrum');
  });

  it('passes through already-canonical methodology', () => {
    expect(canonicalizeMethodology('waterfall', null)).toBe('waterfall');
    expect(canonicalizeMethodology('scrum', null)).toBe('scrum');
    expect(canonicalizeMethodology('kanban', null)).toBe('kanban');
    expect(canonicalizeMethodology('hybrid', null)).toBe('hybrid');
    expect(canonicalizeMethodology('HYBRID', null)).toBe('hybrid');
  });

  it('returns null for unmappable input (does not guess)', () => {
    expect(canonicalizeMethodology(null, null)).toBeNull();
    expect(canonicalizeMethodology('', '')).toBeNull();
    expect(canonicalizeMethodology('nonsense', 'nonsense')).toBeNull();
    expect(canonicalizeMethodology(undefined, undefined)).toBeNull();
  });

  it('never returns the deprecated "agile" value', () => {
    const inputs: Array<[string | null, string | null]> = [
      ['agile', 'SCRUM'],
      ['agile', null],
      ['agile', 'agile'],
    ];
    for (const [m, d] of inputs) {
      expect(canonicalizeMethodology(m, d)).not.toBe('agile');
    }
  });

  it('isCanonicalMethodology guards the 4-value vocabulary', () => {
    expect(CANONICAL_METHODOLOGIES).toEqual([
      'waterfall',
      'scrum',
      'kanban',
      'hybrid',
    ]);
    expect(isCanonicalMethodology('scrum')).toBe(true);
    expect(isCanonicalMethodology('agile')).toBe(false);
    expect(isCanonicalMethodology(null)).toBe(false);
  });
});
