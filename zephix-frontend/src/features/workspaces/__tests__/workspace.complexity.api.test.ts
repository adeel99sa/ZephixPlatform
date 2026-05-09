import { describe, it, expect, vi, beforeEach } from 'vitest';

import { api } from '@/lib/api';
import {
  getWorkspaceComplexityMode,
  updateWorkspaceComplexityMode,
} from '@/features/workspaces/workspace.api';

describe('workspace complexity API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getWorkspaceComplexityMode calls GET /v1/workspaces/:id/complexity-mode', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ mode: 'lean' });
    const res = await getWorkspaceComplexityMode('ws-99');
    expect(api.get).toHaveBeenCalledWith('/v1/workspaces/ws-99/complexity-mode');
    expect(res.mode).toBe('lean');
  });

  it('updateWorkspaceComplexityMode PATCHes mode', async () => {
    vi.spyOn(api, 'patch').mockResolvedValue({
      mode: 'standard',
      updatedAt: '2026-05-09T12:00:00.000Z',
      updatedBy: 'user-1',
    });
    const res = await updateWorkspaceComplexityMode('ws-99', 'standard');
    expect(api.patch).toHaveBeenCalledWith('/v1/workspaces/ws-99/complexity-mode', {
      mode: 'standard',
    });
    expect(res.mode).toBe('standard');
    expect(res.updatedAt).toBe('2026-05-09T12:00:00.000Z');
  });
});
