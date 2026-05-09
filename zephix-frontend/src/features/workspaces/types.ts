/** AD-B2 / AD-026 — aligned with backend workspace complexity enum (lean | standard | governed). */
export type WorkspaceComplexityMode = 'lean' | 'standard' | 'governed';

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
  complexityMode?: WorkspaceComplexityMode;
};

/** Payload for POST /workspaces — optional fields omitted use backend defaults. */
export type WorkspaceCreatePayload = {
  name: string;
  slug?: string;
  description?: string;
  visibility?: 'OPEN' | 'CLOSED';
  complexityMode?: WorkspaceComplexityMode;
};

