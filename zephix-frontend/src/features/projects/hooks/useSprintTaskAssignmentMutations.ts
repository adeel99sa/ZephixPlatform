import type { Dispatch, SetStateAction } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addTaskToSprint, removeTaskFromSprint } from '@/features/sprints/sprints.api';
import { invalidateStatsCache } from '@/features/work-management/workTasks.stats.api';
import type { WorkTask } from '@/features/work-management/workTasks.api';
import {
  workTasksByProjectQueryKey,
  type WorkTasksByProjectData,
} from '@/features/projects/workTasksQueryKey';

export type SprintIterationVars = {
  taskId: string;
  previousIterationId: string | null;
  nextIterationId: string | null;
};

type LocalSync = {
  getTasks: () => WorkTask[];
  setTasks: Dispatch<SetStateAction<WorkTask[]>>;
};

type MutationContext = {
  previousCache: WorkTasksByProjectData | undefined;
  previousLocal: WorkTask[] | undefined;
};

/**
 * Sprint add/remove via REST, with optimistic updates on the shared work-task list query.
 * Optional `localSync` mirrors optimistic updates into WaterfallTable local state until that view migrates fully to the same query.
 */
export function useSprintTaskAssignmentMutations(
  workspaceId: string | undefined | null,
  projectId: string | undefined | null,
  localSync?: LocalSync,
) {
  const queryClient = useQueryClient();
  const key =
    workspaceId && projectId
      ? workTasksByProjectQueryKey(workspaceId, projectId)
      : null;

  return useMutation({
    mutationFn: async (vars: SprintIterationVars) => {
      const { taskId, previousIterationId, nextIterationId } = vars;
      if (previousIterationId) {
        await removeTaskFromSprint(previousIterationId, taskId);
      }
      if (nextIterationId) {
        await addTaskToSprint(nextIterationId, taskId);
      }
    },
    onMutate: async (vars): Promise<MutationContext> => {
      let previousCache: WorkTasksByProjectData | undefined;
      let previousLocal: WorkTask[] | undefined;

      if (key) {
        await queryClient.cancelQueries({ queryKey: key });
        previousCache = queryClient.getQueryData<WorkTasksByProjectData>(key);
        queryClient.setQueryData<WorkTasksByProjectData>(key, (old) => {
          const base = old ?? { items: [], total: 0 };
          return {
            ...base,
            items: base.items.map((t) =>
              t.id === vars.taskId ? { ...t, iterationId: vars.nextIterationId } : t,
            ),
          };
        });
      }

      if (localSync) {
        previousLocal = localSync.getTasks().map((t) => ({ ...t }));
        localSync.setTasks((prev) =>
          prev.map((t) =>
            t.id === vars.taskId ? { ...t, iterationId: vars.nextIterationId } : t,
          ),
        );
      }

      return { previousCache, previousLocal };
    },
    onError: (_err, _vars, context) => {
      const ctx = context as MutationContext | undefined;
      if (key) {
        if (ctx?.previousCache !== undefined) {
          queryClient.setQueryData(key, ctx.previousCache);
        } else {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
      if (localSync && ctx?.previousLocal) {
        localSync.setTasks(ctx.previousLocal);
      }
    },
    onSuccess: () => {
      if (projectId) {
        invalidateStatsCache(projectId);
        window.dispatchEvent(
          new CustomEvent('task:changed', { detail: { projectId } }),
        );
      }
    },
    onSettled: () => {
      if (key) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      }
    },
  });
}
