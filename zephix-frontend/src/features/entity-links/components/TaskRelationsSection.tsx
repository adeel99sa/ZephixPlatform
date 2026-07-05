import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FileText, Link2, Loader2, Plus, Trash2, X } from 'lucide-react';

import {
  createEntityLink,
  deleteEntityLink,
  listEntityLinksForEntity,
  loadProjectRelationPickerOptions,
} from '../entityLinks.api';
import type {
  EntityLink,
  EntityLinkRelationType,
  RelationPickerOption,
  RelationPickerTargetType,
} from '../entityLinks.types';
import { mapEntityLinkApiError } from '../mapEntityLinkApiError';
import {
  buildLabelMap,
  otherEndpoint,
  relationDirectionLabel,
  relationTypeChip,
  resolveEndpointLabel,
} from '../relationDisplay';

const POPOVER_Z = 60;

type AddStep = 'type' | 'pick' | 'relation';

export type TaskRelationsSectionProps = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  canEdit: boolean;
  onLinksCountChange?: (count: number) => void;
};

function linkEndpointsKey(link: EntityLink): string {
  const a = `${link.sourceEntityType}:${link.sourceEntityId}`;
  const b = `${link.targetEntityType}:${link.targetEntityId}`;
  return [a, b].sort().join('|');
}

function isOptionAlreadyLinked(
  links: EntityLink[],
  taskId: string,
  option: RelationPickerOption,
): boolean {
  return links.some((link) => {
    const other = otherEndpoint(link, taskId);
    return other?.type === option.entityType && other.id === option.entityId;
  });
}

function AddRelationPopover({
  anchorRef,
  onClose,
  pickerOptions,
  links,
  taskId,
  workspaceId,
  onCreated,
  onInlineError,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  pickerOptions: RelationPickerOption[];
  links: EntityLink[];
  taskId: string;
  workspaceId: string;
  onCreated: (link: EntityLink) => void;
  onInlineError: (message: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties | null>(null);
  const [step, setStep] = useState<AddStep>('type');
  const [targetType, setTargetType] = useState<RelationPickerTargetType | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RelationPickerOption | null>(null);
  const [relationType, setRelationType] = useState<EntityLinkRelationType>('RELATES_TO');
  const [creating, setCreating] = useState(false);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const updatePosition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 288;
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8,
      );
      setFixedStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
        maxHeight: 'min(360px, 70vh)',
        zIndex: POPOVER_Z,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [anchorRef, onClose]);

  const filteredOptions = useMemo(() => {
    if (!targetType) return [];
    const q = search.trim().toLowerCase();
    return pickerOptions
      .filter((o) => o.entityType === targetType)
      .filter((o) => !isOptionAlreadyLinked(links, taskId, o))
      .filter((o) => {
        if (!q) return true;
        return (
          o.label.toLowerCase().includes(q) ||
          (o.subtitle?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 20);
  }, [pickerOptions, targetType, search, links, taskId]);

  const handleCreate = async () => {
    if (!selected || creating) return;
    setCreating(true);
    onInlineError('');
    try {
      const link = await createEntityLink(workspaceId, {
        sourceEntityType: 'TASK',
        sourceEntityId: taskId,
        targetEntityType: selected.entityType,
        targetEntityId: selected.entityId,
        relationType,
      });
      onCreated(link);
      onClose();
    } catch (err) {
      const mapped = mapEntityLinkApiError(err);
      onInlineError(mapped.message);
    } finally {
      setCreating(false);
    }
  };

  const popoverInner = (
    <div
      ref={panelRef}
      className="rounded-lg border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden"
      style={fixedStyle ?? undefined}
      data-testid="relations-add-popover"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold text-slate-700">
          {step === 'type' && 'Link to…'}
          {step === 'pick' && (targetType === 'RISK' ? 'Select risk' : 'Select artifact item')}
          {step === 'relation' && 'Relation type'}
        </span>
        <button type="button" onClick={onClose} className="rounded p-0.5 hover:bg-slate-100">
          <X className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>

      <div className="overflow-y-auto p-2 flex-1">
        {step === 'type' && (
          <div className="space-y-1">
            <button
              type="button"
              data-testid="relations-pick-risk"
              onClick={() => {
                setTargetType('RISK');
                setStep('pick');
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-orange-50 text-left"
            >
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
              Risk
            </button>
            <button
              type="button"
              data-testid="relations-pick-artifact"
              onClick={() => {
                setTargetType('ARTIFACT');
                setStep('pick');
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-indigo-50 text-left"
            >
              <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
              Artifact item
            </button>
          </div>
        )}

        {step === 'pick' && (
          <div className="space-y-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
              data-testid="relations-search"
              autoFocus
            />
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No items available</p>
            ) : (
              <div className="space-y-0.5">
                {filteredOptions.map((opt) => (
                  <button
                    key={`${opt.entityType}:${opt.entityId}`}
                    type="button"
                    data-testid={`relations-option-${opt.entityId}`}
                    onClick={() => {
                      setSelected(opt);
                      setRelationType('RELATES_TO');
                      setStep('relation');
                    }}
                    className="w-full text-left rounded px-2 py-1.5 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{opt.label}</p>
                    {opt.subtitle && (
                      <p className="text-[10px] text-slate-400 truncate">{opt.subtitle}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setStep('type');
                setTargetType(null);
                setSearch('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
          </div>
        )}

        {step === 'relation' && selected && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 truncate">{selected.label}</p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="relationType"
                  checked={relationType === 'RELATES_TO'}
                  onChange={() => setRelationType('RELATES_TO')}
                />
                <span className="text-sm">Relates to</span>
              </label>
              {selected.entityType === 'RISK' && (
                <label className="flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="relationType"
                    checked={relationType === 'MITIGATES'}
                    onChange={() => setRelationType('MITIGATES')}
                    data-testid="relations-relation-mitigates"
                  />
                  <span className="text-sm">Mitigates</span>
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('pick');
                  setSelected(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                ← Back
              </button>
              <button
                type="button"
                data-testid="relations-create-link"
                disabled={creating}
                onClick={() => void handleCreate()}
                className="ml-auto rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Linking…' : 'Create link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!fixedStyle) return null;
  return createPortal(popoverInner, document.body);
}

export function TaskRelationsSection({
  workspaceId,
  projectId,
  taskId,
  canEdit,
  onLinksCountChange,
}: TaskRelationsSectionProps) {
  const [links, setLinks] = useState<EntityLink[]>([]);
  const [pickerOptions, setPickerOptions] = useState<RelationPickerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const labelMap = useMemo(() => buildLabelMap(pickerOptions), [pickerOptions]);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const [nextLinks, options] = await Promise.all([
        listEntityLinksForEntity(workspaceId, 'TASK', taskId),
        loadProjectRelationPickerOptions(projectId),
      ]);
      setLinks(nextLinks);
      setPickerOptions(options);
      onLinksCountChange?.(nextLinks.length);
    } catch {
      setLoadError('Could not load relations.');
      onLinksCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, taskId, onLinksCountChange]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const handleCreated = (link: EntityLink) => {
    setInlineError('');
    setLinks((prev) => {
      const exists = prev.some((l) => l.id === link.id || linkEndpointsKey(l) === linkEndpointsKey(link));
      const next = exists ? prev : [...prev, link];
      onLinksCountChange?.(next.length);
      return next;
    });
  };

  const executeDelete = async (linkId: string) => {
    setDeleting(true);
    try {
      await deleteEntityLink(workspaceId, linkId);
      setLinks((prev) => {
        const next = prev.filter((l) => l.id !== linkId);
        onLinksCountChange?.(next.length);
        return next;
      });
    } catch (err) {
      const mapped = mapEntityLinkApiError(err);
      setInlineError(mapped.message);
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="task-relations-loading">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3" data-testid="task-relations-section">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Relations
        </h4>
        {canEdit && (
          <button
            ref={addButtonRef}
            type="button"
            data-testid="relations-add-button"
            onClick={() => {
              setInlineError('');
              setShowAdd((v) => !v);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {loadError && (
        <p className="text-sm text-red-600" role="alert">
          {loadError}
        </p>
      )}

      {inlineError && (
        <p className="text-sm text-red-600 rounded border border-red-200 bg-red-50 px-2 py-1.5" role="alert" data-testid="relations-inline-error">
          {inlineError}
        </p>
      )}

      {links.length === 0 ? (
        <div className="text-center py-10">
          <Link2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No relations yet</p>
          {canEdit && (
            <p className="text-xs text-slate-300 mt-1">Link risks or artifact items to this task</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => {
            const other = otherEndpoint(link, taskId);
            if (!other) return null;
            const otherLabel = resolveEndpointLabel(other.type, other.id, labelMap);
            const direction = relationDirectionLabel(link, taskId, otherLabel);
            const chip = relationTypeChip(link);

            return (
              <li
                key={link.id}
                className="group flex items-start gap-2 rounded border border-slate-200 p-2"
                data-testid={`relation-row-${link.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {chip}
                    </span>
                    <span className="text-[10px] uppercase text-slate-400">{other.type}</span>
                  </div>
                  <p className="text-sm text-slate-800 truncate">{direction}</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    title="Remove link"
                    data-testid={`relation-remove-${link.id}`}
                    onClick={() => setPendingDeleteId(link.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showAdd && canEdit && (
        <AddRelationPopover
          anchorRef={addButtonRef}
          onClose={() => setShowAdd(false)}
          pickerOptions={pickerOptions}
          links={links}
          taskId={taskId}
          workspaceId={workspaceId}
          onCreated={handleCreated}
          onInlineError={setInlineError}
        />
      )}

      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          data-testid="relations-delete-dialog"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Remove this relation?</h3>
            <p className="mt-2 text-sm text-slate-600">The link will be deleted. Items are not removed.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void executeDelete(pendingDeleteId)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
