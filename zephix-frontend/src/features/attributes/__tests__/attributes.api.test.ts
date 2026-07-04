import { describe, expect, it, beforeEach } from 'vitest';

import {
  createAttributeDefinition,
  listAvailableAttributes,
  resetAttributeMocks,
  upsertTaskAttributeValue,
} from '../attributes.api';
import { mapAttributeApiError } from '../mapAttributeApiError';

describe('attributes.api (mock layer)', () => {
  beforeEach(() => {
    resetAttributeMocks();
  });

  it('lists available definitions with mixed scopes', async () => {
    const defs = await listAvailableAttributes('ws-fixture-1');
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.some((d) => d.scope === 'SYSTEM')).toBe(true);
    expect(defs.some((d) => d.scope === 'ORG')).toBe(true);
    expect(defs.some((d) => d.locked)).toBe(true);
  });

  it('creates workspace-scoped definition', async () => {
    const created = await createAttributeDefinition(
      {
        key: 'custom_flag',
        label: 'Custom Flag',
        dataType: 'boolean',
        required: false,
      },
      'ws-fixture-1',
    );
    expect(created.scope).toBe('WORKSPACE');
    expect(created.key).toBe('custom_flag');
  });

  it('maps ATTRIBUTE_TYPE_MISMATCH on invalid upsert', async () => {
    await expect(
      upsertTaskAttributeValue('task-1', 'attr-ws-effort-hours', 'not-a-number', 'ws-fixture-1'),
    ).rejects.toMatchObject({ code: 'ATTRIBUTE_TYPE_MISMATCH' });

    try {
      await upsertTaskAttributeValue('task-1', 'attr-ws-effort-hours', 'bad', 'ws-fixture-1');
    } catch (err) {
      const mapped = mapAttributeApiError(err);
      expect(mapped.code).toBe('ATTRIBUTE_TYPE_MISMATCH');
      expect(mapped.message).toContain('attribute type');
    }
  });
});
