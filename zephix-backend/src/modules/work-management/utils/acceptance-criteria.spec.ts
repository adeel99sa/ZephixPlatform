import {
  normalizeAcceptanceCriteria,
  validateAcceptanceCriteria,
  normalizeDefinitionOfDone,
  validateDefinitionOfDone,
} from './acceptance-criteria.utils';

describe('Acceptance Criteria Utils', () => {
  describe('normalizeAcceptanceCriteria', () => {
    it('trims whitespace', () => {
      const result = normalizeAcceptanceCriteria([
        { text: '  hello world  ', done: false },
      ]);
      expect(result).toEqual([{ text: 'hello world', done: false }]);
    });

    it('collapses multiple spaces', () => {
      const result = normalizeAcceptanceCriteria([
        { text: 'hello    world   test', done: true },
      ]);
      expect(result).toEqual([{ text: 'hello world test', done: true }]);
    });

    it('removes empty items', () => {
      const result = normalizeAcceptanceCriteria([
        { text: '  ', done: false },
        { text: 'valid', done: true },
        { text: '', done: false },
      ]);
      expect(result).toEqual([{ text: 'valid', done: true }]);
    });

    it('enforces max 20 items', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({
        text: `Item ${i}`,
        done: false,
      }));
      const result = normalizeAcceptanceCriteria(items);
      expect(result).toHaveLength(20);
    });

    it('truncates text to 240 chars', () => {
      const longText = 'a'.repeat(300);
      const result = normalizeAcceptanceCriteria([
        { text: longText, done: false },
      ]);
      expect(result[0].text).toHaveLength(240);
    });

    it('preserves order', () => {
      const result = normalizeAcceptanceCriteria([
        { text: 'first', done: false },
        { text: 'second', done: true },
        { text: 'third', done: false },
      ]);
      expect(result.map((i) => i.text)).toEqual(['first', 'second', 'third']);
    });

    it('handles non-array input', () => {
      const result = normalizeAcceptanceCriteria(null as any);
      expect(result).toEqual([]);
    });
  });

  describe('validateAcceptanceCriteria', () => {
    it('returns null for valid input', () => {
      expect(
        validateAcceptanceCriteria([
          { text: 'test', done: false },
        ]),
      ).toBeNull();
    });

    it('rejects non-array', () => {
      expect(validateAcceptanceCriteria('bad' as any)).toContain('must be an array');
    });

    it('rejects more than 20 items', () => {
      const items = Array.from({ length: 21 }, () => ({ text: 'x', done: false }));
      expect(validateAcceptanceCriteria(items)).toContain('more than 20');
    });

    it('rejects missing text', () => {
      expect(
        validateAcceptanceCriteria([{ done: false } as any]),
      ).toContain('text must be a string');
    });

    it('rejects missing done', () => {
      expect(
        validateAcceptanceCriteria([{ text: 'ok' } as any]),
      ).toContain('done must be a boolean');
    });

    it('rejects text over 240 chars', () => {
      expect(
        validateAcceptanceCriteria([{ text: 'a'.repeat(241), done: false }]),
      ).toContain('exceeds 240');
    });
  });

  describe('normalizeDefinitionOfDone', () => {
    it('trims and collapses spaces', () => {
      expect(normalizeDefinitionOfDone(['  hello   world  '])).toEqual([
        'hello world',
      ]);
    });

    it('removes empty items', () => {
      expect(normalizeDefinitionOfDone(['  ', 'valid', ''])).toEqual(['valid']);
    });

    it('enforces max 20 items', () => {
      const items = Array.from({ length: 25 }, (_, i) => `Item ${i}`);
      expect(normalizeDefinitionOfDone(items)).toHaveLength(20);
    });

    it('truncates to 240 chars', () => {
      expect(normalizeDefinitionOfDone(['a'.repeat(300)])[0]).toHaveLength(240);
    });
  });

  describe('validateDefinitionOfDone', () => {
    it('returns null for valid input', () => {
      expect(validateDefinitionOfDone(['one', 'two'])).toBeNull();
    });

    it('rejects non-string items', () => {
      expect(validateDefinitionOfDone([123 as any])).toContain('must be a string');
    });

    it('rejects more than 20 items', () => {
      const items = Array.from({ length: 21 }, () => 'x');
      expect(validateDefinitionOfDone(items)).toContain('more than 20');
    });
  });
});
