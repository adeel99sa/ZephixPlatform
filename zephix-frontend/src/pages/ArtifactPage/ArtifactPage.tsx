import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';

import { artifactTypeLabel } from '@/features/artifacts/constants/artifactTypes.constants';
import { ArtifactItemDetailPanel } from '@/features/artifacts/components/ArtifactItemDetailPanel';
import {
  ArtifactItemsFilterBar,
  type ArtifactItemsFilterState,
} from '@/features/artifacts/components/ArtifactItemsFilterBar';
import { useResizableSplit } from '@/hooks/use-resizable-split';
import {
  useArtifactItems,
  useProjectArtifact,
} from '@/hooks/use-project-artifacts';
import { useWorkspaceStore } from '@/state/workspace.store';

const ARTIFACT_LIST_PX_KEY = 'zephix-artifact-list-px';
const LIST_MIN = 280;
const LIST_DEFAULT = 400;

const DEFAULT_FILTERS: ArtifactItemsFilterState = {
  search: '',
  assignee: '',
  priority: '',
};

export default function ArtifactPage() {
  const { projectId, artifactId } = useParams<{ projectId: string; artifactId: string }>();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ArtifactItemsFilterState>(DEFAULT_FILTERS);

  const { data: artifact, isLoading: artifactLoading, error: artifactError } =
    useProjectArtifact(projectId, artifactId);
  const listParams = useMemo(
    () => ({
      limit: 100,
      ...(filters.assignee.trim() ? { assignee: filters.assignee.trim() } : {}),
    }),
    [filters.assignee],
  );
  const { data: itemsPage, isLoading: itemsLoading } = useArtifactItems(
    projectId,
    artifactId,
    listParams,
  );

  const { listPx, splitRef, onResizerPointerDown, isDragging } = useResizableSplit({
    storageKey: ARTIFACT_LIST_PX_KEY,
    defaultPx: LIST_DEFAULT,
    minPx: LIST_MIN,
    maxFraction: 0.62,
  });

  const items = useMemo(() => {
    const raw = itemsPage?.items ?? [];
    const q = filters.search.trim().toLowerCase();
    return raw.filter((it) => {
      if (filters.priority && it.priority !== filters.priority) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q);
    });
  }, [itemsPage?.items, filters.search, filters.priority]);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const title = artifact ? artifact.name : 'Artifact';

  const typeLabel = useMemo(
    () => (artifact ? artifactTypeLabel(artifact.type) : ''),
    [artifact],
  );

  if (!projectId || !artifactId) {
    return (
      <div className="p-6 text-sm text-slate-600" data-testid="artifact-page-missing-params">
        Missing project or artifact.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-white" data-testid="artifact-page">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          data-testid="artifact-back-to-project"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Project
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
          {typeLabel ? (
            <p className="truncate text-xs text-slate-500">{typeLabel}</p>
          ) : null}
        </div>
      </header>

      {artifactLoading ? (
        <div className="flex flex-1 items-center justify-center text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          <span className="sr-only">Loading artifact</span>
        </div>
      ) : artifactError || !artifact ? (
        <div className="p-6 text-sm text-red-600" data-testid="artifact-page-error">
          Unable to load this artifact.
        </div>
      ) : (
        <div
          ref={splitRef}
          className="flex min-h-0 flex-1 flex-col md:flex-row"
          data-testid="artifact-split"
        >
          <section
            className="flex min-h-0 flex-col border-slate-200 md:border-r"
            data-testid="artifact-list-pane"
          >
            <div
              className="hidden min-h-0 flex-col md:flex"
              style={{ width: listPx, minWidth: LIST_MIN, maxWidth: '62vw' }}
            >
              <ArtifactItemsFilterBar value={filters} onChange={setFilters} />
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Items ({items.length})
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto" role="list" aria-label="Artifact items">
                {itemsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : items.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-slate-500" data-testid="artifact-items-empty">
                    No items match your filters.
                  </p>
                ) : (
                  items.map((item) => {
                    const active = selectedItemId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="listitem"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`w-full border-b border-slate-50 px-3 py-2.5 text-left text-sm transition ${
                          active ? 'bg-blue-50 text-blue-900' : 'text-slate-800 hover:bg-slate-50'
                        }`}
                        data-testid={`artifact-item-row-${item.id}`}
                      >
                        <span className="line-clamp-2 font-medium">{item.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col md:hidden">
              {!selectedItemId ? (
                <>
                  <ArtifactItemsFilterBar value={filters} onChange={setFilters} />
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full border-b border-slate-100 px-3 py-3 text-left text-sm"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1 border-b border-slate-200 px-3 py-2 text-sm text-blue-700"
                    onClick={() => setSelectedItemId(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to list
                  </button>
                  {selectedItem ? (
                    <ArtifactItemDetailPanel
                      projectId={projectId}
                      artifact={artifact}
                      item={selectedItem}
                    />
                  ) : null}
                </>
              )}
            </div>
          </section>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panes"
            className={`hidden w-1 shrink-0 cursor-col-resize bg-slate-200 md:block ${
              isDragging ? 'bg-blue-300' : 'hover:bg-slate-300'
            }`}
            onPointerDown={onResizerPointerDown}
            data-testid="artifact-split-resizer"
          />

          <section className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="artifact-detail-pane">
            <div className="hidden min-h-0 flex-1 flex-col p-4 md:flex">
              {selectedItem ? (
                <ArtifactItemDetailPanel
                  projectId={projectId}
                  artifact={artifact}
                  item={selectedItem}
                />
              ) : (
                <p className="text-sm text-slate-500">Select an item to view details.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {!workspaceId ? (
        <p className="sr-only" data-testid="artifact-workspace-hint">
          Active workspace required for artifact API calls.
        </p>
      ) : null}
    </div>
  );
}
