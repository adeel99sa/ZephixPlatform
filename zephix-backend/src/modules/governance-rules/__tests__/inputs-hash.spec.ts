import { computeInputsHash } from '../engine/inputs-hash';

describe('computeInputsHash', () => {
  it('returns a 16-character hex string', () => {
    const hash = computeInputsHash({ foo: 'bar' });
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('produces deterministic output', () => {
    const input = { entityId: 'abc', status: 'DONE', value: 42 };
    const hash1 = computeInputsHash(input);
    const hash2 = computeInputsHash(input);
    expect(hash1).toBe(hash2);
  });

  it('produces same hash regardless of key order', () => {
    const hash1 = computeInputsHash({ a: 1, b: 2, c: 3 });
    const hash2 = computeInputsHash({ c: 3, a: 1, b: 2 });
    expect(hash1).toBe(hash2);
  });

  it('normalizes numbers to fixed(4) precision strings', () => {
    const hash1 = computeInputsHash({ val: 42 });
    const hash2 = computeInputsHash({ val: 42.0 });
    const hash3 = computeInputsHash({ val: 42.0000 });
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
    // Different at 4th decimal → different hash
    const hash4 = computeInputsHash({ val: 42.1234 });
    const hash5 = computeInputsHash({ val: 42.1235 });
    expect(hash4).not.toBe(hash5);
  });

  it('42.001 and 42.0010 produce same hash via toFixed(4)', () => {
    const hash1 = computeInputsHash({ val: 42.001 });
    const hash2 = computeInputsHash({ val: 42.0010 });
    expect(hash1).toBe(hash2);
  });

  it('handles null and undefined', () => {
    const hash1 = computeInputsHash({ val: null });
    const hash2 = computeInputsHash({ val: undefined });
    expect(hash1).toBe(hash2);
  });

  it('handles nested objects', () => {
    const hash1 = computeInputsHash({ nested: { b: 2, a: 1 } });
    const hash2 = computeInputsHash({ nested: { a: 1, b: 2 } });
    expect(hash1).toBe(hash2);
  });

  it('handles arrays preserving order', () => {
    const hash1 = computeInputsHash({ arr: [1, 2, 3] });
    const hash2 = computeInputsHash({ arr: [3, 2, 1] });
    expect(hash1).not.toBe(hash2);
  });
});
