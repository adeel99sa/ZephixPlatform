import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

import * as projectArtifactsApi from '@/api/project-artifacts.api';
import type { ProjectArtifactItem } from '@/api/project-artifacts.types';
import {
  artifactItemsQueryKey,
  useUpdateArtifactItemMutation,
} from '../use-project-artifacts';

vi.mock('@/api/project-artifacts.api');

const projectId = 'proj-1';
const artifactId = 'art-1';

const baseItem: ProjectArtifactItem = {
  id: 'item-1',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  artifactId,
  name: 'Original',
  content: {},
  customFieldValues: { probability: 'Low' },
  position: 0,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateArtifactItemMutation optimistic rollback', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(artifactItemsQueryKey(projectId, artifactId, {}), {
      items: [baseItem],
      total: 1,
      page: 1,
      pageSize: 50,
    });
  });

  it('applies optimistic update immediately', async () => {
    vi.mocked(projectArtifactsApi.updateArtifactItem).mockImplementation(
      () => new Promise(() => {}),
    );

    const { result } = renderHook(
      () => useUpdateArtifactItemMutation(projectId, artifactId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      void result.current.mutate({
        itemId: 'item-1',
        patch: { name: 'Updated name' },
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{
        items: ProjectArtifactItem[];
      }>(artifactItemsQueryKey(projectId, artifactId, {}));
      expect(cached?.items[0]?.name).toBe('Updated name');
    });
  });

  it('rolls back cache on 400 error', async () => {
    vi.mocked(projectArtifactsApi.updateArtifactItem).mockRejectedValue(
      new axios.AxiosError('bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { code: 'CUSTOM_FIELD_VALIDATION', message: 'Invalid value' },
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      }),
    );

    const { result } = renderHook(
      () => useUpdateArtifactItemMutation(projectId, artifactId),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({
          itemId: 'item-1',
          patch: { name: 'Bad update' },
        });
      } catch {
        // expected
      }
    });

    const cached = queryClient.getQueryData<{
      items: ProjectArtifactItem[];
    }>(artifactItemsQueryKey(projectId, artifactId, {}));
    expect(cached?.items[0]?.name).toBe('Original');
  });

  it('rolls back cache on 500 error', async () => {
    vi.mocked(projectArtifactsApi.updateArtifactItem).mockRejectedValue(
      new axios.AxiosError('server error', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 500,
        data: { message: 'Internal error' },
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as never,
      }),
    );

    const { result } = renderHook(
      () => useUpdateArtifactItemMutation(projectId, artifactId),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({
          itemId: 'item-1',
          patch: { customFieldValues: { probability: 'High' } },
        });
      } catch {
        // expected
      }
    });

    const cached = queryClient.getQueryData<{
      items: ProjectArtifactItem[];
    }>(artifactItemsQueryKey(projectId, artifactId, {}));
    expect(cached?.items[0]?.customFieldValues).toEqual({ probability: 'Low' });
  });
});
