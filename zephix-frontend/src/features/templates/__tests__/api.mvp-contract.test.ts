import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import {
  createProjectFromTemplate,
  getTemplateDetail,
  listTemplates,
} from '../api';

import { apiClient } from '@/lib/api/client';

describe('templates API MVP contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists templates through mode=mvp contract', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        data: [{ id: 'tpl-1', name: 'Simple Task Tracker' }],
      },
    });

    const result = await listTemplates();

    expect(apiClient.get).toHaveBeenCalledWith('/templates', {
      params: { mode: 'mvp' },
    });
    expect(result).toHaveLength(1);
  });

  it('gets template detail through mode=mvp contract', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        data: { id: 'tpl-2', name: 'Agile Delivery' },
      },
    });

    await getTemplateDetail('tpl-2');

    expect(apiClient.get).toHaveBeenCalledWith('/templates/tpl-2', {
      params: { mode: 'mvp' },
    });
  });

  it('creates projects through /projects/from-template', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        data: { id: 'project-1', workspaceId: 'workspace-1' },
      },
    });

    const payload = {
      templateId: 'tpl-1',
      workspaceId: 'workspace-1',
      projectName: 'Migration Project',
      importOptions: {
        includeViews: true,
        includeTasks: true,
        includePhases: true,
        includeMilestones: true,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
    };

    await createProjectFromTemplate(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/projects/from-template', payload);
  });
});
