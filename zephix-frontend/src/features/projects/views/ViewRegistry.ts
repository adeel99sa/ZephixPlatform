/**
 * ViewRegistry — UX Step 2
 *
 * Service that loads views from the API, merges with hardcoded defaults,
 * tracks the active viewId, and provides CRUD helpers.
 *
 * Used by the view config store and project layout to drive the view switcher.
 */

import {
  listProjectViews,
  createProjectView,
  updateProjectView,
  deleteProjectView,
  type ProjectView,
  type ViewConfig,
  type CreateViewPayload,
  type UpdateViewPayload,
} from './views.api';

/* ------------------------------------------------------------------ */
/*  Default views (fallback when backend has none)                     */
/* ------------------------------------------------------------------ */

export interface DefaultView {
  type: string;
  label: string;
  sortOrder: number;
  isEnabled: boolean;
  config: ViewConfig;
}

const DEFAULT_VIEWS: DefaultView[] = [
  { type: 'list', label: 'List', sortOrder: 0, isEnabled: true, config: {} },
  { type: 'board', label: 'Board', sortOrder: 1, isEnabled: true, config: {} },
  { type: 'gantt', label: 'Gantt', sortOrder: 2, isEnabled: true, config: {} },
  { type: 'table', label: 'Table', sortOrder: 3, isEnabled: true, config: {} },
];

/* ------------------------------------------------------------------ */
/*  ViewRegistry class                                                 */
/* ------------------------------------------------------------------ */

export class ViewRegistry {
  private views: ProjectView[] = [];
  private activeViewId: string | null = null;
  private projectId: string | null = null;
  private loaded = false;

  /* ---- Getters ---- */

  getViews(): ProjectView[] {
    return this.views;
  }

  getEnabledViews(): ProjectView[] {
    return this.views.filter((v) => v.isEnabled);
  }

  getActiveViewId(): string | null {
    return this.activeViewId;
  }

  getActiveView(): ProjectView | null {
    if (!this.activeViewId) return null;
    return this.views.find((v) => v.id === this.activeViewId) ?? null;
  }

  getViewConfig(viewId?: string): ViewConfig {
    const id = viewId ?? this.activeViewId;
    if (!id) return {};
    const view = this.views.find((v) => v.id === id);
    return view?.config ?? {};
  }

  getViewByType(type: string): ProjectView | undefined {
    return this.views.find((v) => v.type === type);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  /* ---- Load & merge ---- */

  /**
   * Load views from the backend for a project.
   * If backend returns empty, fall back to default views.
   */
  async loadViews(projectId: string): Promise<ProjectView[]> {
    this.projectId = projectId;

    try {
      const serverViews = await listProjectViews(projectId);

      if (serverViews.length > 0) {
        this.views = serverViews.sort((a, b) => a.sortOrder - b.sortOrder);
      } else {
        // No server views — use defaults as synthetic ProjectView objects
        this.views = DEFAULT_VIEWS.map((dv, idx) => ({
          id: `default-${dv.type}`,
          projectId,
          type: dv.type,
          label: dv.label,
          name: null,
          sortOrder: dv.sortOrder,
          isEnabled: dv.isEnabled,
          ownerId: null,
          config: dv.config,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }

      this.loaded = true;

      // Preserve active view if it still exists
      if (this.activeViewId) {
        const stillExists = this.views.find((v) => v.id === this.activeViewId);
        if (!stillExists) {
          this.activeViewId = this.views[0]?.id ?? null;
        }
      } else {
        this.activeViewId = this.views[0]?.id ?? null;
      }

      return this.views;
    } catch (err) {
      console.error('ViewRegistry: failed to load views', err);
      this.loaded = true;
      return this.views;
    }
  }

  /* ---- Active view management ---- */

  setActiveView(viewId: string): void {
    this.activeViewId = viewId;
  }

  setActiveViewByType(type: string): void {
    const match = this.views.find((v) => v.type === type);
    if (match) {
      this.activeViewId = match.id;
    }
  }

  /* ---- CRUD ---- */

  /**
   * Save the config for a specific view (debounce externally if needed).
   */
  async saveViewConfig(viewId: string, config: ViewConfig): Promise<ProjectView | null> {
    if (!this.projectId) return null;
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return null;

    // Skip saves for synthetic default views
    if (view.id.startsWith('default-')) return null;

    try {
      const updated = await updateProjectView(this.projectId, viewId, { config });
      // Update local cache
      this.views = this.views.map((v) => (v.id === viewId ? updated : v));
      return updated;
    } catch (err) {
      console.error('ViewRegistry: failed to save view config', err);
      return null;
    }
  }

  /**
   * Create a new custom view.
   */
  async createView(
    dto: CreateViewPayload,
    personal = false,
  ): Promise<ProjectView | null> {
    if (!this.projectId) return null;

    try {
      const created = await createProjectView(this.projectId, dto, personal);
      this.views = [...this.views, created].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      return created;
    } catch (err) {
      console.error('ViewRegistry: failed to create view', err);
      return null;
    }
  }

  /**
   * Delete a custom view. Cannot delete system default views.
   */
  async deleteView(viewId: string): Promise<boolean> {
    if (!this.projectId) return false;
    const view = this.views.find((v) => v.id === viewId);
    if (!view || view.id.startsWith('default-')) return false;

    try {
      await deleteProjectView(this.projectId, viewId);
      this.views = this.views.filter((v) => v.id !== viewId);

      // If we deleted the active view, switch to first available
      if (this.activeViewId === viewId) {
        this.activeViewId = this.views[0]?.id ?? null;
      }

      return true;
    } catch (err) {
      console.error('ViewRegistry: failed to delete view', err);
      return false;
    }
  }

  /* ---- Reset ---- */

  reset(): void {
    this.views = [];
    this.activeViewId = null;
    this.projectId = null;
    this.loaded = false;
  }
}

/**
 * Singleton instance for use across the project workspace.
 * For per-project isolation, create new instances via `new ViewRegistry()`.
 */
export const viewRegistry = new ViewRegistry();
