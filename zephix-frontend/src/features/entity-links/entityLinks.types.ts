export type EntityLinkEntityType = 'TASK' | 'RISK' | 'ARTIFACT';

export type EntityLinkRelationType = 'RELATES_TO' | 'MITIGATES';

export interface EntityLink {
  id: string;
  organizationId: string;
  workspaceId: string;
  sourceEntityType: EntityLinkEntityType;
  sourceEntityId: string;
  targetEntityType: EntityLinkEntityType;
  targetEntityId: string;
  relationType: EntityLinkRelationType;
  createdBy: string;
  createdAt: string;
}

export type RelationPickerTargetType = 'RISK' | 'ARTIFACT';

export interface RelationPickerOption {
  entityType: RelationPickerTargetType;
  entityId: string;
  label: string;
  subtitle?: string;
  /** Required for ARTIFACT items when opening detail routes. */
  artifactId?: string;
}
