import { describe, expect, it } from 'vitest';

import { humanizeTemplateComputedDelta } from './humanizeTemplateComputedDelta';

describe('humanizeTemplateComputedDelta', () => {
  it('describes version and phase-grouped blocks', () => {
    const lines = humanizeTemplateComputedDelta({
      templateVersion: 3,
      blocks: [
        {
          blockId: 't1',
          enabled: true,
          displayOrder: 1,
          config: { phaseName: 'Execution' },
          locked: false,
        },
        {
          blockId: 't2',
          enabled: true,
          displayOrder: 2,
          config: { phaseName: 'Execution' },
          locked: false,
        },
      ],
    });
    expect(lines.some((l) => l.includes('version'))).toBe(true);
    expect(lines.some((l) => l.includes('Execution'))).toBe(true);
  });

  it('maps risk-style block ids to a risks tab line', () => {
    const lines = humanizeTemplateComputedDelta({
      blocks: [{ blockId: 'tab-risks', enabled: true, displayOrder: 0, config: {}, locked: false }],
    });
    expect(lines.some((l) => /risks/i.test(l))).toBe(true);
  });
});
