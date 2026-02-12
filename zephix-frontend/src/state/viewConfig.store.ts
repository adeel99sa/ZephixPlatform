/**
 * View Config Store — UX Step 2
 *
 * Zustand store managing the active view configuration for the current project.
 * Syncs to backend on change (debounced).
 */

import { create } from 'zustand';
import type { ViewConfig, ProjectView } from '@/features/projects/views/views.api';
import {
  listProjectViews,
  updateProjectView,
} from '@/features/projects/views/views.api';

/* ------------------------------------------------------------------ */
/*  State shape                                                        */
/* ------------------------------------------------------------------ */

interface ViewConfigState {
  /** All views for the current project */
  views: ProjectView[];
  /** Currently active view ID */
  activeViewId: string | null;
  /** Loading state */
  loading: boolean;
  /** Last loaded project ID */
  projectId: string | null;

  /* ---- Actions ---- */

  /** Load views for a project from API */
  loadViews: (projectId: string) => Promise<void>;

  /** Set the active view by ID */
  setActiveView: (viewId: string) => void;

  /** Set the active view by type (e.g. 'list', 'board') */
  setActiveViewByType: (type: string) => void;

  /** Get the active view's config */
  getActiveConfig: () => ViewConfig;

  /** Update the active view's config locally and sync to backend */
  updateConfig: (projectId: string, partial: Partial<ViewConfig>) => void;

  /** Reset store when leaving project */
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Debounced save                                                     */
/* ------------------------------------------------------------------ */

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(projectId: string, viewId: string, config: ViewConfig) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await updateProjectView(projectId, viewId, { config });
    } catch (err) {
      console.error('Failed to persist view config:', err);
    }
  }, 800);
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useViewConfigStore = create<ViewConfigState>((set, get) => ({
  views: [],
  activeViewId: null,
  loading: false,
  projectId: null,

  loadViews: async (projectId: string) => {
    // Skip if already loaded for this project
    if (get().projectId === projectId && get().views.length > 0) return;

    set({ loading: true, projectId });
    try {
      const views = await listProjectViews(projectId);
      const enabledViews = views.filter((v) => v.isEnabled);
      set({
        views: enabledViews,
        loading: false,
        // Keep active view if it still exists, else default to first
        activeViewId:
          enabledViews.find((v) => v.id === get().activeViewId)?.id ??
          enabledViews[0]?.id ??
          null,
      });
    } catch (err) {
      console.error('Failed to load views:', err);
      set({ loading: false });
    }
  },

  setActiveView: (viewId: string) => {
    set({ activeViewId: viewId });
  },

  setActiveViewByType: (type: string) => {
    const match = get().views.find((v) => v.type === type);
    if (match) set({ activeViewId: match.id });
  },

  getActiveConfig: () => {
    const { views, activeViewId } = get();
    const active = views.find((v) => v.id === activeViewId);
    return active?.config ?? {};
  },

  updateConfig: (projectId: string, partial: Partial<ViewConfig>) => {
    const { views, activeViewId } = get();
    if (!activeViewId) return;

    const updated = views.map((v) => {
      if (v.id !== activeViewId) return v;
      return { ...v, config: { ...v.config, ...partial } };
    });
    set({ views: updated });

    // Debounced save to backend
    const activeView = updated.find((v) => v.id === activeViewId);
    if (activeView) {
      debouncedSave(projectId, activeViewId, activeView.config);
    }
  },

  reset: () => {
    if (saveTimer) clearTimeout(saveTimer);
    set({ views: [], activeViewId: null, loading: false, projectId: null });
  },
}));
