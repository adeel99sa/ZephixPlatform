import {
  CONDITIONAL_GO_PROGRESSION_KEY,
  parseConditionalGoProgression,
} from './conditional-go.constants';

describe('conditional-go.constants (thresholds.conditionalGoProgression)', () => {
  it('defaults to auto when key missing', () => {
    expect(parseConditionalGoProgression({})).toBe('auto');
    expect(parseConditionalGoProgression(null)).toBe('auto');
  });

  it('returns manual only when thresholds.conditionalGoProgression is manual', () => {
    expect(
      parseConditionalGoProgression({
        [CONDITIONAL_GO_PROGRESSION_KEY]: 'manual',
      }),
    ).toBe('manual');
  });

  it('treats any non-manual value as auto', () => {
    expect(
      parseConditionalGoProgression({
        [CONDITIONAL_GO_PROGRESSION_KEY]: 'auto',
      }),
    ).toBe('auto');
  });
});
