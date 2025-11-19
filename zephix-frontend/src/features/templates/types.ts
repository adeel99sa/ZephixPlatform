export interface Template {
  id: string;
  title: string;
  description: string;
  type: 'workspace' | 'project' | 'dashboard' | 'document' | 'form';
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplyTemplateRequest {
  templateId: string;
  workspaceId?: string;
  name?: string;
  description?: string;
}

