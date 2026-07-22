import { describe, expect, it } from 'vitest';

import {
  ALL_TAB_IDS,
  readVisibleTabIds,
  TAB_ORDER,
} from '../projectVisibleTabs';

describe('projectVisibleTabs Sprint 5.2a / TC-F2b', () => {
  it('TAB_ORDER includes plan, documents, risks, and change-requests', () => {
    expect(TAB_ORDER).toContain('plan');
    expect(TAB_ORDER).toContain('documents');
    expect(TAB_ORDER).toContain('risks');
    expect(TAB_ORDER).toContain('change-requests');
  });

  it('ALL_TAB_IDS matches TAB_ORDER only (no orphan legacy ids)', () => {
    expect([...ALL_TAB_IDS].sort()).toEqual([...TAB_ORDER].sort());
  });

  it('readVisibleTabIds keeps documents and risks when present', () => {
    const ids = readVisibleTabIds({
      visibleTabs: ['overview', 'documents', 'tasks', 'risks', 'board'],
    });
    expect(ids).toContain('documents');
    expect(ids).toContain('risks');
    expect(ids).toContain('overview');
    expect(ids).toContain('tasks');
  });
});
