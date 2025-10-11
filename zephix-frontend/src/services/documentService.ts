import { api } from './api';

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  methodology: string;
  templateType: string;
  description: string;
  fields: any;
  isActive: boolean;
  isSystem: boolean;
  organizationId: string;
  createdBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  templateId: string;
  documentName: string;
  documentType: string;
  content: any;
  status: string;
  version: number;
  createdBy: string;
  lastModifiedBy: string;
  approvedBy: string;
  approvedAt: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  template?: DocumentTemplate;
}

export interface DocumentStats {
  total: number;
  byStatus: Array<{ status: string; count: string }>;
  byType: Array<{ type: string; count: string }>;
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  userId: string;
  action: string;
  details: any;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class DocumentService {
  // Templates
  async getTemplates(category?: string, methodology?: string): Promise<DocumentTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (methodology) params.append('methodology', methodology);
    
    const response = await api.get(`/documents/templates?${params.toString()}`);
    return response.data;
  }

  async getTemplate(id: string): Promise<DocumentTemplate> {
    const response = await api.get(`/documents/templates/${id}`);
    return response.data;
  }

  // Documents
  async createFromTemplate(data: {
    templateId: string;
    projectName?: string;
    initialContent?: any;
  }): Promise<{
    document: ProjectDocument;
    shouldAttachToProject: boolean;
    projectId?: string;
    projectName?: string;
  }> {
    const response = await api.post('/documents/create-from-template', data);
    return response.data;
  }

  async attachToProject(documentId: string, projectId: string): Promise<ProjectDocument> {
    const response = await api.post(`/documents/${documentId}/attach-to-project`, { projectId });
    return response.data;
  }

  async updateDocument(documentId: string, content: any): Promise<ProjectDocument> {
    const response = await api.put(`/documents/${documentId}`, { content });
    return response.data;
  }

  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    const response = await api.get(`/documents/project/${projectId}`);
    return response.data;
  }

  async getDocument(documentId: string): Promise<ProjectDocument> {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  }

  async quickCreate(command: string, projectId: string): Promise<{
    document: ProjectDocument;
    shouldAttachToProject: boolean;
    projectId?: string;
    projectName?: string;
  }> {
    const response = await api.post('/documents/quick-create', { command, projectId });
    return response.data;
  }

  async changeStatus(documentId: string, status: string): Promise<ProjectDocument> {
    const response = await api.put(`/documents/${documentId}/status`, { status });
    return response.data;
  }

  async getStats(): Promise<DocumentStats> {
    const response = await api.get('/documents/stats/overview');
    return response.data;
  }

  async getDocumentActivity(documentId: string): Promise<DocumentActivity[]> {
    const response = await api.get(`/documents/${documentId}/activity`);
    return response.data;
  }

  // Utility methods
  async exportDocument(documentId: string, format: 'pdf' | 'docx' = 'pdf'): Promise<Blob> {
    const response = await api.get(`/documents/${documentId}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async duplicateDocument(documentId: string, newName?: string): Promise<ProjectDocument> {
    const response = await api.post(`/documents/${documentId}/duplicate`, { newName });
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  }
}

export const documentService = new DocumentService();


