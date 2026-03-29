export type Workspace = {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  description?: string;
  defaultMethodology?: string | null;
  businessUnitLabel?: string | null;
  defaultTemplateId?: string | null;
  inheritOrgDefaultTemplate?: boolean;
  governanceInheritanceMode?: 'ORG_DEFAULT' | 'WORKSPACE_OVERRIDE';
  allowedTemplateIds?: string[] | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  deletedBy: string | null;
};

