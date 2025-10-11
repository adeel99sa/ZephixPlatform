import { api } from './api';

export interface TrashItem {
  id: string;
  itemType: 'project' | 'task' | 'workspace' | 'team' | 'risk' | 'resource';
  itemName: string;
  deletedAt: string;
  deletedBy: string;
  deletedByUser?: {
    name: string;
    email: string;
  };
}

export interface TrashResponse {
  success: boolean;
  message: string;
  count?: number;
}

export interface TrashItemsResponse {
  items: TrashItem[];
  total: number;
  page: number;
  totalPages: number;
}

class TrashService {
  private baseUrl = '/api/trash';

  async getTrashItems(page: number = 1, limit: number = 50): Promise<TrashItemsResponse> {
    const response = await api.get(`${this.baseUrl}?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  async restoreItem(itemType: string, id: string): Promise<TrashResponse> {
    const response = await api.post(`${this.baseUrl}/restore`, {
      itemType,
      id
    });
    return response.data;
  }

  async permanentDelete(itemType: string, id: string): Promise<TrashResponse> {
    const response = await api.delete(`${this.baseUrl}/permanent/${itemType}/${id}`);
    return response.data;
  }

  async emptyTrash(): Promise<TrashResponse> {
    const response = await api.delete(`${this.baseUrl}/empty`);
    return response.data;
  }

  // Helper method to restore multiple items
  async restoreMultipleItems(items: { itemType: string; id: string }[]): Promise<TrashResponse> {
    const promises = items.map(item => this.restoreItem(item.itemType, item.id));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return {
      success: failed === 0,
      message: `Restored ${successful} items${failed > 0 ? `, ${failed} failed` : ''}`,
      count: successful
    };
  }
}

export const trashService = new TrashService();
export default trashService;

