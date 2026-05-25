import { describe, expect, it } from 'vitest';

import { mapArtifact, mapArtifactItem } from '../project-artifacts.mappers';

describe('project-artifacts.mappers', () => {
  it('mapArtifact uses enum_values when enumValues is a truthy non-array', () => {
    const raw = {
      id: 'a1',
      project_id: 'p1',
      workspace_id: 'w1',
      organization_id: 'o1',
      type: 'risk_register',
      name: 'Risks',
      created_by: 'u1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      position: 0,
      custom_field_definitions: [
        {
          id: 'probability',
          name: 'Probability',
          type: 'enum',
          enum_values: ['Low', 'High'],
          required: true,
        },
      ],
    };
    const mapped = mapArtifact(raw);
    expect(mapped?.customFieldDefinitions[0]?.enumValues).toEqual(['Low', 'High']);
  });

  it('mapFieldDefinition omits enumValues when coerced value is not an array', () => {
    const raw = {
      id: 'a1',
      project_id: 'p1',
      workspace_id: 'w1',
      organization_id: 'o1',
      type: 'risk_register',
      name: 'Risks',
      created_by: 'u1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      position: 0,
      custom_field_definitions: [
        {
          id: 'probability',
          name: 'Probability',
          type: 'enum',
          enumValues: {},
          required: true,
        },
      ],
    };
    const mapped = mapArtifact(raw);
    expect(mapped?.customFieldDefinitions[0]?.enumValues).toBeUndefined();
  });

  it('mapArtifactItem maps snake_case custom_field_values', () => {
    const mapped = mapArtifactItem({
      id: 'i1',
      artifact_id: 'a1',
      workspace_id: 'w1',
      organization_id: 'o1',
      name: 'Item 1',
      created_by: 'u1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      custom_field_values: { probability: 'High' },
      position: 1,
    });
    expect(mapped?.customFieldValues).toEqual({ probability: 'High' });
  });
});
