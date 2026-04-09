import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  MoreHorizontal,
  Plus,
  Star,
} from "lucide-react";

import type { Favorite } from "@/features/favorites/api";
import { useFavorites, useRemoveFavorite, useAddFavorite } from "@/features/favorites/hooks";
import { useNavigationRecentsStore } from "@/state/navigationRecents.store";
import {
  useFavoritesLayoutStore,
  type FavoritesSortMode,
} from "@/state/favoritesLayout.store";
import { track } from "@/lib/telemetry";

const ITEM_TYPE_LABELS: Record<string, string> = {
  workspace: "Workspace",
  project: "Project",
  dashboard: "Dashboard",
};

const DND_FAVORITE = "application/x-zephix-favorite-id";

/** Fixed panel opening to the right of the trigger (main content), not clipped by sidebar overflow. */
function computeFavoritesMenuStyle(
  anchor: HTMLElement,
  preferredWidth: number,
): CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const gap = 8;
  const edge = 12;
  const vw = window.innerWidth;
  let width = Math.min(preferredWidth, vw - edge * 2);
  let left = rect.right + gap;
  const top = rect.bottom + gap;
  if (left + width > vw - edge) {
    left = Math.max(edge, vw - width - edge);
  }
  if (left < edge) {
    left = edge;
    width = Math.min(width, vw - edge * 2);
  }
  return {
    position: "fixed",
    top,
    left,
    width,
    zIndex: 200,
    maxHeight: "min(70vh, calc(100vh - 24px))",
  };
}

function FavoritesFixedMenuPortal({
  open,
  anchorRef,
  popoverRef,
  preferredWidth,
  className,
  testId,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  preferredWidth: number;
  className: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!open || !anchorRef.current) return;
    setStyle(computeFavoritesMenuStyle(anchorRef.current, preferredWidth));
  }, [open, anchorRef, preferredWidth]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={style}
      className={className}
      data-testid={testId}
      data-favorites-fixed-menu
    >
      {children}
    </div>,
    document.body,
  );
}

function sortFavorites(list: Favorite[], mode: FavoritesSortMode): Favorite[] {
  const copy = [...list];
  if (mode === "alpha") {
    copy.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
    );
    return copy;
  }
  copy.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return copy;
}

function FavoritesSectionHeader({
  expanded,
  onToggle,
  moreOpen,
  setMoreOpen,
  plusOpen,
  setPlusOpen,
  sortMode,
  onSortSaved,
  onSortAlpha,
  onNewFolder,
}: {
  expanded: boolean;
  onToggle: () => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  plusOpen: boolean;
  setPlusOpen: (v: boolean) => void;
  sortMode: FavoritesSortMode;
  onSortSaved: () => void;
  onSortAlpha: () => void;
  onNewFolder: () => void;
}) {
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const morePopoverRef = useRef<HTMLDivElement>(null);
  const plusPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen && !plusOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreButtonRef.current?.contains(t) || plusButtonRef.current?.contains(t)) return;
      if (morePopoverRef.current?.contains(t) || plusPopoverRef.current?.contains(t)) return;
      setMoreOpen(false);
      setPlusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen, plusOpen, setMoreOpen, setPlusOpen]);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5" data-testid="section-favorites">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-900 hover:text-slate-950 transition"
        aria-expanded={expanded}
        data-testid="section-favorites-chevron"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-700 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        Favorites
      </button>
      <div className="ml-auto flex items-center gap-0.5">
        <div className="relative flex items-center">
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => {
              setPlusOpen(false);
              setMoreOpen((v) => !v);
            }}
            className={`rounded p-0.5 text-slate-400 transition hover:bg-slate-100 focus-visible:opacity-100 ${
              moreOpen ? "opacity-100" : "opacity-0 group-hover/favorites-shell:opacity-100"
            }`}
            title="Favorites settings"
            aria-label="Favorites settings"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            data-testid="section-favorites-more"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          <FavoritesFixedMenuPortal
            open={moreOpen}
            anchorRef={moreButtonRef}
            popoverRef={morePopoverRef}
            preferredWidth={220}
            className="min-w-[12rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            testId="section-favorites-more-menu"
          >
            <div role="menu" aria-label="Favorites settings">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={sortMode === "saved"}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  onSortSaved();
                  setMoreOpen(false);
                }}
                data-testid="section-favorites-sort-saved"
              >
                <span className="w-4 text-center text-xs">{sortMode === "saved" ? "✓" : ""}</span>
                Default order
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={sortMode === "alpha"}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  onSortAlpha();
                  setMoreOpen(false);
                }}
                data-testid="section-favorites-sort-alpha"
              >
                <span className="w-4 text-center text-xs">{sortMode === "alpha" ? "✓" : ""}</span>
                Alphabetical
              </button>
              <div className="my-1 border-t border-slate-100" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  setMoreOpen(false);
                  onNewFolder();
                }}
                data-testid="section-favorites-new-folder"
              >
                New folder
              </button>
            </div>
          </FavoritesFixedMenuPortal>
        </div>
        <div className="relative flex items-center">
          <button
            ref={plusButtonRef}
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setPlusOpen((v) => !v);
            }}
            className={`rounded p-0.5 text-slate-400 transition hover:bg-slate-100 focus-visible:opacity-100 ${
              plusOpen ? "opacity-100" : "opacity-0 group-hover/favorites-shell:opacity-100"
            }`}
            title="Add to favorites from recents"
            aria-label="Add to favorites from recents"
            aria-expanded={plusOpen}
            aria-haspopup="menu"
            data-testid="section-favorites-plus"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {plusOpen && (
            <FavoritesAddFromRecentsMenu
              open
              anchorRef={plusButtonRef}
              popoverRef={plusPopoverRef}
              onClose={() => setPlusOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FavoritesAddFromRecentsMenu({
  open,
  anchorRef,
  popoverRef,
  onClose,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const entries = useNavigationRecentsStore((s) => s.entries);
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();

  const favorited = useMemo(() => {
    const s = new Set<string>();
    (favorites ?? []).forEach((f) => s.add(`${f.itemType}:${f.itemId}`));
    return s;
  }, [favorites]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (favorited.has(e.key)) return false;
      if (!qq) return true;
      return (
        e.label.toLowerCase().includes(qq) ||
        e.path.toLowerCase().includes(qq) ||
        e.itemType.includes(qq)
      );
    });
  }, [entries, favorited, q]);

  return (
    <FavoritesFixedMenuPortal
      open={open}
      anchorRef={anchorRef}
      popoverRef={popoverRef}
      preferredWidth={288}
      className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      testId="section-favorites-plus-menu"
    >
      <div role="menu">
        <div className="border-b border-slate-100 px-2 py-1.5">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-300"
            data-testid="section-favorites-recents-search"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Recents
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No matching pages.</p>
          ) : (
            filtered.map((e) => (
              <button
                key={e.key}
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  addFavorite.mutate(
                    { itemType: e.itemType, itemId: e.itemId },
                    {
                      onSuccess: () => {
                        track("sidebar.favorites_add_recent", { itemType: e.itemType });
                        onClose();
                      },
                    },
                  );
                }}
                data-testid={`section-favorites-recent-${e.key}`}
              >
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="shrink-0 text-[10px] uppercase text-slate-400">
                  {ITEM_TYPE_LABELS[e.itemType] ?? e.itemType}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </FavoritesFixedMenuPortal>
  );
}

function FavoriteRow({
  favorite,
  onRemove,
  onNavigate,
}: {
  favorite: Favorite;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className="group/fav flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-slate-50 transition cursor-pointer"
      data-testid={`favorite-item-${favorite.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_FAVORITE, favorite.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        type="button"
        onClick={onNavigate}
        className="flex-1 truncate text-left text-slate-800 font-medium"
      >
        {favorite.displayName}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded p-0.5 text-slate-400 opacity-0 group-hover/fav:opacity-100 hover:bg-slate-200 hover:text-red-500 transition"
        aria-label="Remove from favorites"
        data-testid={`favorite-remove-${favorite.id}`}
      >
        <span className="text-xs">✕</span>
      </button>
    </div>
  );
}

export function FavoritesSidebarSection({
  expanded,
  onToggleExpanded,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const navigate = useNavigate();
  const { data: favorites } = useFavorites();
  const removeFavorite = useRemoveFavorite();

  const sortMode = useFavoritesLayoutStore((s) => s.sortMode);
  const setSortMode = useFavoritesLayoutStore((s) => s.setSortMode);
  const folders = useFavoritesLayoutStore((s) => s.folders);
  const addFolder = useFavoritesLayoutStore((s) => s.addFolder);
  const renameFolder = useFavoritesLayoutStore((s) => s.renameFolder);
  const deleteFolder = useFavoritesLayoutStore((s) => s.deleteFolder);
  const assignFavoriteToFolder = useFavoritesLayoutStore((s) => s.assignFavoriteToFolder);
  const favoriteFolderIdByFavoriteId = useFavoritesLayoutStore(
    (s) => s.favoriteFolderIdByFavoriteId,
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const hasFavorites = (favorites?.length ?? 0) > 0;

  const sortedAll = useMemo(
    () => sortFavorites(favorites ?? [], sortMode),
    [favorites, sortMode],
  );

  const rootFavorites = useMemo(
    () => sortedAll.filter((f) => !favoriteFolderIdByFavoriteId[f.id]),
    [sortedAll, favoriteFolderIdByFavoriteId],
  );

  const navigateFavorite = useCallback(
    (fav: Favorite) => {
      if (fav.itemType === "workspace") navigate(`/workspaces/${fav.itemId}/home`);
      else if (fav.itemType === "project") navigate(`/projects/${fav.itemId}`);
      else navigate(`/dashboards/${fav.itemId}`);
    },
    [navigate],
  );

  const onNewFolder = () => {
    const name = window.prompt("Folder name", "New folder");
    if (name === null) return;
    const id = addFolder(name);
    setOpenFolders((o) => ({ ...o, [id]: true }));
    track("sidebar.favorites_folder_create", {});
  };

  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!folderMenuId) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(`[data-folder-menu-anchor="${folderMenuId}"]`)) return;
      setFolderMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [folderMenuId]);

  const dropRootProps =
    folders.length > 0
      ? {
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            const id = e.dataTransfer.getData(DND_FAVORITE);
            if (id) assignFavoriteToFolder(id, null);
          },
        }
      : {};

  return (
    <div className="group/favorites-shell">
      <FavoritesSectionHeader
        expanded={expanded}
        onToggle={onToggleExpanded}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        plusOpen={plusOpen}
        setPlusOpen={setPlusOpen}
        sortMode={sortMode}
        onSortSaved={() => setSortMode("saved")}
        onSortAlpha={() => setSortMode("alpha")}
        onNewFolder={onNewFolder}
      />
      {expanded && (
        <>
          {hasFavorites ? (
            <div className="ml-2 space-y-1" data-testid="favorites-list">
              {folders.length > 0 && (
                <div
                  className="rounded-md border border-dashed border-transparent px-2 py-1 text-[11px] text-slate-400 hover:border-slate-200 hover:bg-slate-50/80"
                  {...dropRootProps}
                  data-testid="favorites-drop-root"
                >
                  Drop here to show under All favorites (ungroup)
                </div>
              )}
              {rootFavorites.map((fav) => (
                <FavoriteRow
                  key={fav.id}
                  favorite={fav}
                  onRemove={() =>
                    removeFavorite.mutate({ itemType: fav.itemType, itemId: fav.itemId })
                  }
                  onNavigate={() => navigateFavorite(fav)}
                />
              ))}
              {folders.map((folder) => {
                const open = openFolders[folder.id] !== false;
                const inFolder = sortedAll.filter(
                  (f) => favoriteFolderIdByFavoriteId[f.id] === folder.id,
                );
                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div
                      className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-slate-50"
                      data-folder-menu-anchor={folder.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData(DND_FAVORITE);
                        if (id) assignFavoriteToFolder(id, folder.id);
                      }}
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-1 truncate rounded px-1 py-1 text-left text-xs font-semibold text-slate-700"
                        onClick={() =>
                          setOpenFolders((o) => ({ ...o, [folder.id]: !open }))
                        }
                        aria-expanded={open}
                      >
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        )}
                        <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate">{folder.name}</span>
                      </button>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          className={`rounded p-0.5 text-slate-400 hover:bg-slate-100 ${
                            folderMenuId === folder.id ? "opacity-100" : "opacity-0 group-hover/favorites-shell:opacity-100"
                          }`}
                          aria-label={`${folder.name} folder actions`}
                          data-testid={`favorite-folder-more-${folder.id}`}
                          onClick={() =>
                            setFolderMenuId((id) => (id === folder.id ? null : folder.id))
                          }
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {folderMenuId === folder.id && (
                          <div
                            className="absolute right-0 top-full z-[130] mt-0.5 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-md"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                              onClick={() => {
                                setFolderMenuId(null);
                                const next = window.prompt("Rename folder", folder.name);
                                if (next !== null && next.trim()) renameFolder(folder.id, next);
                              }}
                            >
                              Rename folder
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-slate-50"
                              onClick={() => {
                                setFolderMenuId(null);
                                if (window.confirm(`Delete folder “${folder.name}”? Favorites stay in the list (ungrouped).`)) {
                                  deleteFolder(folder.id);
                                }
                              }}
                            >
                              Delete folder
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {open &&
                      inFolder.map((fav) => (
                        <div key={fav.id} className="ml-4 border-l border-slate-100 pl-2">
                          <FavoriteRow
                            favorite={fav}
                            onRemove={() =>
                              removeFavorite.mutate({
                                itemType: fav.itemType,
                                itemId: fav.itemId,
                              })
                            }
                            onNavigate={() => navigateFavorite(fav)}
                          />
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-2 py-2 text-sm text-slate-400"
              data-testid="favorites-empty"
            >
              <Star className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
              <span>Add to your sidebar</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
