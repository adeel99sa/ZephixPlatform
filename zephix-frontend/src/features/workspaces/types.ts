export type Workspace = {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  description?: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  deletedBy: string | null;
};

