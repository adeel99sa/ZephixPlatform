export type Project = {
  id: string;
  name: string;
  workspaceId: string | null;
  organizationId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

