import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';

import { Tabs } from '@/components/ui/overlay/Tabs';
import { isPlatformAdmin } from '@/utils/access';
import { useAuth } from '@/state/AuthContext';

import type { AttributeDefinition } from '../attributes.types';
import { CreateAttributeForm } from './CreateAttributeForm';

export type AttributeColumnPanelProps = {
  available: AttributeDefinition[];
  visibleIds: Set<string>;
  onToggleColumn: (definitionId: string, visible: boolean) => void;
  onCreated: (definition: AttributeDefinition) => void;
  workspaceId: string;
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
  if (def.scope === 'ORG') return 'Org';
  return 'Workspace';
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

  const sections: Array<{ key: OriginGroup; title: string }> = [
    { key: 'template', title: 'Template-attached' },
    { key: 'workspaceOrg', title: 'Workspace / Org' },
    { key: 'system', title: 'System library' },
  ];

  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {sections.map(({ key, title }) => {
        const items = grouped[key];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <ul className="space-y-1">
              {items.map((def) => {
                const isVisible = visibleIds.has(def.id);
                return (
                  <li
                    key={def.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                    data-testid={`attr-available-${def.id}`}
                  >
                    {def.locked ? (
                      <span
                        className="flex flex-1 items-center gap-1.5 text-xs text-slate-700"
                        title={lockTooltip(def)}
                        data-testid={`attr-locked-${def.id}`}
                      >
                        <Lock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate">{def.label}</span>
                        <span className="text-[10px] text-slate-400">({scopeLabel(def)})</span>
                      </span>
                    ) : (
                      <label className="flex flex-1 cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => onToggleColumn(def.id, e.target.checked)}
                          className="h-3 w-3 rounded border-slate-300 text-indigo-600"
                          data-testid={`attr-toggle-${def.id}`}
                        />
                        <span className="truncate">{def.label}</span>
                        <span className="text-[10px] text-slate-400">({scopeLabel(def)})</span>
                      </label>
                    )}
                    {def.locked && isVisible ? (
                      <span className="text-[10px] text-indigo-600">Shown</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
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
}: AttributeColumnPanelProps) {
  const { user } = useAuth();
  const isAdmin = isPlatformAdmin(user);
  const [activeTab, setActiveTab] = useState('existing');

  return (
    <div
      className="absolute right-0 top-8 z-30 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
      data-testid="attribute-column-panel"
      onClick={(e) => e.stopPropagation()}
    >
      <Tabs
        defaultActiveTab="existing"
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
        tabContentClassName="pt-1"
      />
      <span className="sr-only" data-testid="attr-panel-active-tab">
        {activeTab}
      </span>
    </div>
  );
}
