import { describe, expect, it } from 'vitest';

import {
  columnConfigHasLegacyTabs,
  stripLegacyVisibleTabs,
} from '../stripLegacyVisibleTabs';

describe('stripLegacyVisibleTabs', () => {
  it('strips project_artifacts but keeps documents and risks', () => {
    const next = stripLegacyVisibleTabs({
      visibleTabs: ['overview', 'documents', 'tasks', 'risks', 'project_artifacts', 'board'],
    });
    expect(next.visibleTabs).toEqual(['overview', 'documents', 'tasks', 'risks', 'board']);
  });

  it('handles undefined columnConfig gracefully', () => {
    const next = stripLegacyVisibleTabs(undefined);
    expect(next).toEqual({});
    expect(next.visibleTabs).toBeUndefined();
  });

  it('preserves other columnConfig fields', () => {
    const next = stripLegacyVisibleTabs({
      visibleTabs: ['project_artifacts', 'overview', 'documents'],
      showArchived: true,
      density: 'compact',
    });
    expect(next.showArchived).toBe(true);
    expect(next.density).toBe('compact');
    expect(next.visibleTabs).toEqual(['overview', 'documents']);
  });

  it('returns same config when no legacy tabs present', () => {
    const input = { visibleTabs: ['overview', 'tasks', 'documents', 'risks'], showArchived: false };
    const next = stripLegacyVisibleTabs(input);
    expect(next).toEqual(input);
  });

  it('columnConfigHasLegacyTabs detects project_artifacts only', () => {
    expect(columnConfigHasLegacyTabs({ visibleTabs: ['documents'] })).toBe(false);
    expect(columnConfigHasLegacyTabs({ visibleTabs: ['risks'] })).toBe(false);
    expect(columnConfigHasLegacyTabs({ visibleTabs: ['project_artifacts'] })).toBe(true);
  });
});
