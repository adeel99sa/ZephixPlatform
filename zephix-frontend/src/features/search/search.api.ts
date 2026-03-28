// ─────────────────────────────────────────────────────────────────────────────
// Global Search API — Step 27
// ─────────────────────────────────────────────────────────────────────────────

import { request } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';

export interface SearchResultProject {
  id: string;
  name: string;
  status: string;
}

export interface SearchResultTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
}

export interface SearchResultComment {
  id: string;
  body: string;
  taskId: string;
  createdByUserId: string;
  createdAt: string;
}

export interface WorkSearchResult {
  projects: SearchResultProject[];
  tasks: SearchResultTask[];
  comments: SearchResultComment[];
}

const EMPTY_RESULT: WorkSearchResult = {
  projects: [],
  tasks: [],
  comments: [],
};

export async function globalSearch(query: string): Promise<WorkSearchResult> {
  const { activeWorkspaceId } = useWorkspaceStore.getState();
  if (!activeWorkspaceId || !query || query.trim().length < 2) {
    return EMPTY_RESULT;
  }

  try {
    const data = await request.get<WorkSearchResult>('/work/search', {
      params: { q: query.trim() },
    });
    return {
      projects: Array.isArray(data?.projects) ? data.projects : [],
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      comments: Array.isArray(data?.comments) ? data.comments : [],
    };
  } catch {
    return EMPTY_RESULT;
  }
}
