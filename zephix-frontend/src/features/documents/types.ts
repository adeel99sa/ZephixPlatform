export interface Document {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  content: Record<string, unknown> | null;
  version: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  content?: Record<string, unknown>;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: Record<string, unknown>;
}
