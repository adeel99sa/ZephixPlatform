import { api } from '@/lib/api';
import { Template, ApplyTemplateRequest } from './types';

export const listTemplates = async (params?: { type?: string; category?: string }): Promise<Template[]> => {
  const response = await api.get('/templates', { params });
  return response;
};

export const applyTemplate = async (type: string, payload: ApplyTemplateRequest): Promise<any> => {
  const response = await api.post(`/templates/${type}/apply`, payload);
  return response;
};

