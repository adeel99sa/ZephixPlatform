import { describe, it, vi, expect } from 'vitest';
import { useNotifications } from '../useNotifications';
import { renderHook } from '@testing-library/react';
import * as client from '@/lib/api/client';

describe('useNotifications', () => {
  it('uses /api/notifications path via apiClient', async () => {
    const spy = vi.spyOn(client, 'apiClient', 'get').mockReturnValue({} as any); // type shim
    vi.spyOn(client.apiClient, 'get').mockResolvedValue({ data: { items: [] } } as any);

    const { result } = renderHook(() => useNotifications({ status: 'all', page: 1 }));
    await new Promise(r => setTimeout(r, 0));

    expect(client.apiClient.get).toHaveBeenCalledWith('/notifications', { params: { status: 'all', page: 1 } });
    spy.mockRestore();
  });
});
