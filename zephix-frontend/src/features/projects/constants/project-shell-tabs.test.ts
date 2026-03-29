import { describe, expect, it } from 'vitest';

import {
  buildProgressiveShellTabs,
  firstAllowedPathSegment,
  normalizeActiveTabsList,
  parseProjectShellSegment,
} from './project-shell-tabs';

describe('normalizeActiveTabsList', () => {
  it('filters unknown keys and dedupes', () => {
    expect(normalizeActiveTabsList(['overview', 'evil', 'Overview', 'tasks'])).toEqual([
      'overview',
      'tasks',
    ]);
  });

  it('defaults when empty', () => {
    expect(normalizeActiveTabsList([])).toEqual(['overview', 'tasks']);
  });
});

describe('buildProgressiveShellTabs', () => {
  it('dedupes tasks and execution to one Execution route', () => {
    const items = buildProgressiveShellTabs(['overview', 'tasks', 'execution', 'plan']);
    expect(items.map((i) => i.pathSegment)).toEqual([
      'overview',
      'execution',
      'plan',
    ]);
    expect(items[1].label).toBe('Tasks');
  });
});

describe('firstAllowedPathSegment', () => {
  it('returns overview by default', () => {
    expect(firstAllowedPathSegment(['overview', 'tasks'])).toBe('overview');
  });
});

describe('parseProjectShellSegment', () => {
  it('parses segment from path', () => {
    expect(parseProjectShellSegment('/projects/x/overview')).toBe('overview');
    expect(parseProjectShellSegment('/projects/x')).toBeNull();
  });
});
