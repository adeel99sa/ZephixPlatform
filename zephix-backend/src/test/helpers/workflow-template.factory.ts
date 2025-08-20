import {
  WorkflowTemplate,
  WorkflowStatus,
  WorkflowType,
} from '../../workflows/entities/workflow-template.entity';

export function makeWorkflowTemplate(
  overrides: Partial<WorkflowTemplate> = {},
): WorkflowTemplate {
  const now = new Date();
  const base: any = {
    id: 'tmpl_1',
    name: 'Test Template',
    description: 'Test',
    type: WorkflowType.CUSTOM,
    status: WorkflowStatus.DRAFT,
    version: 1,
    isDefault: false,
    isPublic: false,
    usageCount: 0,
    tags: [],
    metadata: {},
    organizationId: 'org_123',
    createdBy: 'user_123',
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    deletedAt: null,
    organization: {} as any,
    creator: {} as any,
    stages: [],
    versions: [],
  };

  const tpl: any = { ...base, ...overrides };

  // Helper methods expected by tests
  tpl.isActive = () => tpl.status === WorkflowStatus.ACTIVE;
  tpl.canBeModified = () => tpl.status !== WorkflowStatus.ARCHIVED;
  tpl.incrementUsage = () => {
    tpl.usageCount = (tpl.usageCount || 0) + 1;
    tpl.lastUsedAt = new Date();
  };
  tpl.clone = (newName?: string) => {
    const now2 = new Date();
    return {
      ...tpl,
      id: `clone_${tpl.id}`,
      name: newName ?? `${tpl.name} Copy`,
      isDefault: false,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: now2,
      updatedAt: now2,
    } as WorkflowTemplate;
  };

  return tpl as WorkflowTemplate;
}
