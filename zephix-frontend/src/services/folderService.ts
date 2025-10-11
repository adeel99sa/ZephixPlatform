import api from './api';

export interface Folder {
  id: string;
  workspaceId: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  organizationId: string;
  createdBy: string;
  hierarchyDepth: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
  children?: Folder[];
  projects?: Project[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  actualCost?: number;
  completionPercentage?: number;
  folderId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderDto {
  workspaceId: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  displayOrder?: number;
}

export interface UpdateFolderDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentFolderId?: string;
  displayOrder?: number;
}

export interface MoveProjectDto {
  projectId: string;
  folderId?: string; // null = move to workspace root
}

export interface BulkMoveDto {
  projectIds: string[];
  folderId?: string;
}

export interface FolderDashboard {
  folder: Folder;
  kpis: {
    totalProjects: number;
    completedProjects: number;
    activeProjects: number;
    averageProgress: number;
    budgetUtilization: number;
    atRiskProjects: number;
    totalBudget: number;
    spentBudget: number;
  };
  projects: Project[];
}

export const folderService = {
  async createFolder(folder: CreateFolderDto) {
    const response = await api.post('/folders', folder);
    return response.data?.data || response.data;
  },

  async getFolderTree(workspaceId: string) {
    const response = await api.get(`/folders/workspace/${workspaceId}/tree`);
    return response.data?.data || response.data;
  },

  async getFolderDashboard(folderId: string): Promise<FolderDashboard> {
    const response = await api.get(`/folders/${folderId}/dashboard`);
    return response.data?.data || response.data;
  },

  async moveProject(moveData: MoveProjectDto) {
    const response = await api.post('/folders/move-project', moveData);
    return response.data?.data || response.data;
  },

  async bulkMoveProjects(moveData: BulkMoveDto) {
    const response = await api.post('/folders/bulk-move', moveData);
    return response.data?.data || response.data;
  },

  async updateFolder(folderId: string, updates: UpdateFolderDto) {
    const response = await api.patch(`/folders/${folderId}`, updates);
    return response.data?.data || response.data;
  },

  async deleteFolder(folderId: string) {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data?.data || response.data;
  }
};
