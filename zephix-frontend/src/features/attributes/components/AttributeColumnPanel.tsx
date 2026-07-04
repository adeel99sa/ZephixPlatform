import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';

import { Tabs } from '@/components/ui/overlay/Tabs';
import { isPlatformAdmin } from '@/utils/access';
import { useAuth } from '@/state/AuthContext';

import type { AttributeDefinition } from '../attributes.types';
import { CreateAttributeForm } from './CreateAttributeForm';

const PANEL_Z = 50;

export type AttributeColumnPanelProps = {
  available: AttributeDefinition[];
  visibleIds: Set<string>;
  onToggleColumn: (definitionId: string, visible: boolean) => void;
  onCreated: (definition: AttributeDefinition) => void;
  workspaceId: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
};

type OriginGroup = 'template' | 'workspaceOrg' | 'system';

function groupForDefinition(def: AttributeDefinition): OriginGroup {
  if (def.locked) return 'template';
  if (def.scope === 'SYSTEM') return 'system';
  return 'workspaceOrg';
}

function lockTooltip(def: AttributeDefinition): string {
  if (def.scope === 'ORG') return 'Locked by Org — required on this template.';
  if (def.scope === 'SYSTEM') return 'Locked by System — required on this template.';
  return 'Locked by Org — required on this template.';
}

function scopeLabel(def: AttributeDefinition): string {
  if (def.scope === 'SYSTEM') return 'System';
  if (def.scope === 'ORG') return 'Organization';
  return 'Workspace';
}

function ScopeBadge({ def }: { def: AttributeDefinition }) {
  return (
    <span
      className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-600"
      title={scopeLabel(def)}
    >
      {scopeLabel(def)}
    </span>
  );
}

function AddExistingList({
  definitions,
  visibleIds,
  onToggleColumn,
}: {
  definitions: AttributeDefinition[];
  visibleIds: Set<string>;
  onToggleColumn: (definitionId: string, visible: boolean) => void;
}) {
  const grouped = useMemo(() => {
    const buckets: Record<OriginGroup, AttributeDefinition[]> = {
      template: [],
      workspaceOrg: [],
      system: [],
    };
    for (const def of definitions) {
      buckets[groupForDefinition(def)].push(def);
    }
    return buckets;
  }, [definitions]);

  const sections: Array<{ key: OriginGroup; title: string; emptyHint: string }> = [
    {
      key: 'template',
      title: 'Template-attached',
      emptyHint: 'No template-locked fields.',
    },
    {
      key: 'workspaceOrg',
      title: 'Workspace & organization',
      emptyHint: 'No workspace or organization fields yet.',
    },
    {
      key: 'system',
      title: 'System library',
      emptyHint: 'No system fields available.',
    },
  ];

  if (definitions.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-slate-500" data-testid="attr-panel-existing-empty">
        No attribute fields yet. Switch to Create new to add one.
      </p>
    );
  }

  return (
    <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
      {sections.map(({ key, title, emptyHint }) => {
        const items = grouped[key];
        return (
          <div key={key}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </p>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400">{emptyHint}</p>
            ) : (
              <ul className="space-y-1">
                {items.map((def) => {
                  const isVisible = visibleIds.has(def.id);
                  return (
                    <li
                      key={def.id}
                      className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                      data-testid={`attr-available-${def.id}`}
                    >
                      {def.locked ? (
                        <span
                          className="flex min-w-0 flex-1 items-start gap-1.5 text-xs text-slate-700"
                          title={lockTooltip(def)}
                          data-testid={`attr-locked-${def.id}`}
                        >
                          <Lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                          <span className="min-w-0 flex-1 break-words">{def.label}</span>
                          <ScopeBadge def={def} />
                        </span>
                      ) : (
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => onToggleColumn(def.id, e.target.checked)}
                            className="mt-0.5 h-3 w-3 shrink-0 rounded border-slate-300 text-indigo-600"
                            data-testid={`attr-toggle-${def.id}`}
                          />
                          <span className="min-w-0 flex-1 break-words">{def.label}</span>
                          <ScopeBadge def={def} />
                        </label>
                      )}
                      {def.locked && isVisible ? (
                        <span className="shrink-0 text-[10px] text-indigo-600">Shown</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AttributeColumnPanel({
  available,
  visibleIds,
  onToggleColumn,
  onCreated,
  workspaceId,
  anchorRef,
  onClose,
}: AttributeColumnPanelProps) {
  const { user } = useAuth();
  const isAdmin = isPlatformAdmin(user);
  const [activeTab, setActiveTab] = useState('existing');
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelWidth = 320;
    const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
    setCoords({
      top: rect.bottom + 4,
      left,
      width: panelWidth,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchorRef, onClose]);

  if (!coords) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: PANEL_Z,
      }}
      data-testid="attribute-column-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        items={[
          {
            id: 'existing',
            label: 'Add existing',
            content: (
              <AddExistingList
                definitions={available}
                visibleIds={visibleIds}
                onToggleColumn={onToggleColumn}
              />
            ),
          },
          {
            id: 'create',
            label: 'Create new',
            content: (
              <CreateAttributeForm
                workspaceId={workspaceId}
                isAdmin={isAdmin}
                onCreated={(def) => {
                  onCreated(def);
                  setActiveTab('existing');
                }}
              />
            ),
          },
        ]}
        tabListClassName="mb-2"
        tabContentClassName="pt-1 px-0 pb-0"
      />
    </div>,
    document.body,
  );
}
