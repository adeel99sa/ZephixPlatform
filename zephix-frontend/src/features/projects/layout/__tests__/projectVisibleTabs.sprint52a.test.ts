import { describe, expect, it } from 'vitest';

import {
  ALL_TAB_IDS,
  readVisibleTabIds,
  TAB_ORDER,
} from '../projectVisibleTabs';

describe('projectVisibleTabs Sprint 5.2a', () => {
  it('TAB_ORDER excludes legacy documents and risks tabs', () => {
    expect(TAB_ORDER).not.toContain('documents');
    expect(TAB_ORDER).not.toContain('risks');
  });

  it('ALL_TAB_IDS matches TAB_ORDER only (no orphan legacy ids)', () => {
    expect([...ALL_TAB_IDS].sort()).toEqual([...TAB_ORDER].sort());
  });

  it('readVisibleTabIds strips documents/risks from saved config', () => {
    const ids = readVisibleTabIds({
      visibleTabs: ['overview', 'documents', 'tasks', 'risks', 'board'],
    });
    expect(ids).not.toContain('documents');
    expect(ids).not.toContain('risks');
    expect(ids).toContain('overview');
    expect(ids).toContain('tasks');
  });
});
