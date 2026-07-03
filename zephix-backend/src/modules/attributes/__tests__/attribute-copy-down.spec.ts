import { TemplateAttributeDefinition } from '../entities/template-attribute-definition.entity';

// MIRRORS templates-instantiate-v51.service.ts:594-611 — this helper does NOT self-enforce;
// if the production mapping changes, update this or the test lies.
// End-to-end proof = STEP 4 staging smoke (instantiate → SELECT project_attribute_definitions shows locked:true).
function applyCopyDown(
  templateAttrs: Pick<
    TemplateAttributeDefinition,
    'attributeDefinitionId' | 'locked' | 'displayOrder'
  >[],
  project: { id: string; organizationId: string; workspaceId: string },
) {
  return templateAttrs.map((ta) => ({
    projectId: project.id,
    attributeDefinitionId: ta.attributeDefinitionId,
    locked: ta.locked,
    displayOrder: ta.displayOrder,
    organizationId: project.organizationId,
    workspaceId: project.workspaceId,
  }));
}

describe('AD-016 attribute copy-down — mapping contract', () => {
  const project = { id: 'proj-1', organizationId: 'org-1', workspaceId: 'ws-1' };

  it('preserves locked:true verbatim (Wave 2 gate enforcement requires this)', () => {
    const rows = applyCopyDown(
      [{ attributeDefinitionId: 'def-1', locked: true, displayOrder: 3 }],
      project,
    );
    expect(rows[0].locked).toBe(true);
  });

  it('preserves locked:false — does not silently upgrade to locked', () => {
    const rows = applyCopyDown(
      [{ attributeDefinitionId: 'def-1', locked: false, displayOrder: 0 }],
      project,
    );
    expect(rows[0].locked).toBe(false);
  });

  it('sources organizationId and workspaceId from project, not template attachment', () => {
    const rows = applyCopyDown(
      [{ attributeDefinitionId: 'def-1', locked: false, displayOrder: 0 }],
      { id: 'proj-1', organizationId: 'org-99', workspaceId: 'ws-99' },
    );
    expect(rows[0].organizationId).toBe('org-99');
    expect(rows[0].workspaceId).toBe('ws-99');
  });

  it('preserves displayOrder verbatim', () => {
    const rows = applyCopyDown(
      [{ attributeDefinitionId: 'def-1', locked: false, displayOrder: 7 }],
      project,
    );
    expect(rows[0].displayOrder).toBe(7);
  });

  it('returns empty array when template has no attached attributes (copy-down is a no-op)', () => {
    const rows = applyCopyDown([], project);
    expect(rows).toHaveLength(0);
  });

  it('copies all template attributes in one pass, preserving per-row locked independently', () => {
    const rows = applyCopyDown(
      [
        { attributeDefinitionId: 'def-1', locked: true, displayOrder: 0 },
        { attributeDefinitionId: 'def-2', locked: false, displayOrder: 1 },
      ],
      project,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].attributeDefinitionId).toBe('def-1');
    expect(rows[0].locked).toBe(true);
    expect(rows[1].attributeDefinitionId).toBe('def-2');
    expect(rows[1].locked).toBe(false);
  });
});
