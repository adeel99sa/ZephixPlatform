import { describe, expect, it } from 'vitest';

import {
  columnConfigHasLegacyTabs,
  stripLegacyVisibleTabs,
} from '../stripLegacyVisibleTabs';

describe('stripLegacyVisibleTabs', () => {
  it('strips documents and risks from visibleTabs', () => {
    const next = stripLegacyVisibleTabs({
      visibleTabs: ['overview', 'documents', 'tasks', 'risks', 'board'],
    });
    expect(next.visibleTabs).toEqual(['overview', 'tasks', 'board']);
  });

  it('handles undefined columnConfig gracefully', () => {
    const next = stripLegacyVisibleTabs(undefined);
    expect(next).toEqual({});
    expect(next.visibleTabs).toBeUndefined();
  });

  it('preserves other columnConfig fields', () => {
    const next = stripLegacyVisibleTabs({
      visibleTabs: ['documents', 'overview'],
      showArchived: true,
      density: 'compact',
    });
    expect(next.showArchived).toBe(true);
    expect(next.density).toBe('compact');
    expect(next.visibleTabs).toEqual(['overview']);
  });

  it('returns same config when no legacy tabs present', () => {
    const input = { visibleTabs: ['overview', 'tasks'], showArchived: false };
    const next = stripLegacyVisibleTabs(input);
    expect(next).toEqual(input);
  });

  it('columnConfigHasLegacyTabs detects legacy ids', () => {
    expect(columnConfigHasLegacyTabs({ visibleTabs: ['documents'] })).toBe(true);
    expect(columnConfigHasLegacyTabs({ visibleTabs: ['overview'] })).toBe(false);
    expect(columnConfigHasLegacyTabs(undefined)).toBe(false);
  });
});
