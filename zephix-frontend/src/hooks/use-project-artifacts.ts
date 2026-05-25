import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  bulkCreateArtifactItems,
  createArtifactItem,
  createProjectArtifact,
  deleteArtifactItem,
  deleteProjectArtifact,
  getProjectArtifact,
  listArtifactItems,
  listProjectArtifacts,
  updateArtifactItem,
  updateProjectArtifact,
} from '@/api/project-artifacts.api';
import { mapArtifactApiError } from '@/api/mapArtifactApiError';
import type {
  CreateArtifactInput,
  CreateArtifactItemInput,
  ListArtifactItemsParams,
  ProjectArtifact,
  ProjectArtifactItem,
  ProjectArtifactType,
  UpdateArtifactInput,
  UpdateArtifactItemInput,
} from '@/api/project-artifacts.types';

export function projectArtifactsQueryKey(projectId: string) {
  return ['project-artifacts', projectId] as const;
}

export function projectArtifactQueryKey(projectId: string, artifactId: string) {
  return ['project-artifact', projectId, artifactId] as const;
}

export function artifactItemsQueryKey(
  projectId: string,
  artifactId: string,
  params?: ListArtifactItemsParams,
) {
  return ['artifact-items', projectId, artifactId, params ?? {}] as const;
}

export function useProjectArtifacts(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? projectArtifactsQueryKey(projectId) : ['project-artifacts', 'none'],
    queryFn: () => listProjectArtifacts(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectArtifact(
  projectId: string | undefined,
  artifactId: string | undefined,
) {
  return useQuery({
    queryKey:
      projectId && artifactId
        ? projectArtifactQueryKey(projectId, artifactId)
        : ['project-artifact', 'none'],
    queryFn: () => getProjectArtifact(projectId!, artifactId!),
    enabled: Boolean(projectId && artifactId),
  });
}

export function useArtifactItems(
  projectId: string | undefined,
  artifactId: string | undefined,
  params: ListArtifactItemsParams = {},
) {
  return useQuery({
    queryKey:
      projectId && artifactId
        ? artifactItemsQueryKey(projectId, artifactId, params)
        : ['artifact-items', 'none'],
    queryFn: () => listArtifactItems(projectId!, artifactId!, params),
    enabled: Boolean(projectId && artifactId),
  });
}

type MutationContext = {
  previousItems?: { items: ProjectArtifactItem[]; total: number; page: number; pageSize: number };
};

function patchItemsCache(
  queryClient: QueryClient,
  projectId: string,
  artifactId: string,
  itemId: string,
  patch: Partial<ProjectArtifactItem>,
) {
  queryClient.setQueriesData<{ items: ProjectArtifactItem[]; total: number; page: number; pageSize: number }>(
    { queryKey: ['artifact-items', projectId, artifactId] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      };
    },
  );
}

export function useCreateProjectArtifact(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArtifactInput) => createProjectArtifact(projectId!, input),
    onSuccess: () => {
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: projectArtifactsQueryKey(projectId) });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

export function useUpdateProjectArtifact(projectId: string | undefined, artifactId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateArtifactInput) =>
      updateProjectArtifact(projectId!, artifactId!, input),
    onSuccess: (updated) => {
      if (projectId && artifactId) {
        queryClient.setQueryData(projectArtifactQueryKey(projectId, artifactId), updated);
        void queryClient.invalidateQueries({ queryKey: projectArtifactsQueryKey(projectId) });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

export function useDeleteProjectArtifact(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artifactId: string) => deleteProjectArtifact(projectId!, artifactId),
    onSuccess: () => {
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: projectArtifactsQueryKey(projectId) });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

export function useCreateArtifactItem(
  projectId: string | undefined,
  artifactId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArtifactItemInput) =>
      createArtifactItem(projectId!, artifactId!, input),
    onSuccess: () => {
      if (projectId && artifactId) {
        void queryClient.invalidateQueries({
          queryKey: ['artifact-items', projectId, artifactId],
        });
        void queryClient.invalidateQueries({ queryKey: projectArtifactsQueryKey(projectId) });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

/** Optimistic item field update with rollback (Pause 2+ pattern). */
export function useUpdateArtifactItemMutation(
  projectId: string | undefined,
  artifactId: string | undefined,
) {
  const queryClient = useQueryClient();
  const itemsKey =
    projectId && artifactId ? artifactItemsQueryKey(projectId, artifactId, {}) : null;

  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: UpdateArtifactItemInput;
    }) => updateArtifactItem(projectId!, artifactId!, itemId, patch),
    onMutate: async ({ itemId, patch }): Promise<MutationContext> => {
      if (!projectId || !artifactId || !itemsKey) return {};
      await queryClient.cancelQueries({ queryKey: ['artifact-items', projectId, artifactId] });
      const previousItems = queryClient.getQueryData<{
        items: ProjectArtifactItem[];
        total: number;
        page: number;
        pageSize: number;
      }>(itemsKey);
      patchItemsCache(queryClient, projectId, artifactId, itemId, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.customFieldValues !== undefined
          ? { customFieldValues: patch.customFieldValues }
          : {}),
        ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        updatedAt: new Date().toISOString(),
      });
      return { previousItems };
    },
    onError: (_err, _vars, context) => {
      if (!projectId || !artifactId || !itemsKey) return;
      const ctx = context as MutationContext | undefined;
      if (ctx?.previousItems !== undefined) {
        queryClient.setQueryData(itemsKey, ctx.previousItems);
      } else {
        void queryClient.invalidateQueries({
          queryKey: ['artifact-items', projectId, artifactId],
        });
      }
    },
    onSettled: () => {
      if (projectId && artifactId) {
        void queryClient.invalidateQueries({
          queryKey: ['artifact-items', projectId, artifactId],
        });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

export function useDeleteArtifactItem(
  projectId: string | undefined,
  artifactId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteArtifactItem(projectId!, artifactId!, itemId),
    onSuccess: () => {
      if (projectId && artifactId) {
        void queryClient.invalidateQueries({
          queryKey: ['artifact-items', projectId, artifactId],
        });
        void queryClient.invalidateQueries({ queryKey: projectArtifactsQueryKey(projectId) });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

export function useBulkCreateArtifactItems(
  projectId: string | undefined,
  artifactId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateArtifactItemInput[]) =>
      bulkCreateArtifactItems(projectId!, artifactId!, items),
    onSuccess: () => {
      if (projectId && artifactId) {
        void queryClient.invalidateQueries({
          queryKey: ['artifact-items', projectId, artifactId],
        });
      }
    },
    meta: { mapError: mapArtifactApiError },
  });
}

export type { ProjectArtifactType };
