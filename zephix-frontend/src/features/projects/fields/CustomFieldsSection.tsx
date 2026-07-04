import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';

import { Tabs } from '@/components/ui/overlay/Tabs';
import { isPlatformAdmin } from '@/utils/access';
import { useAuth } from '@/state/AuthContext';

import type { AttributeDefinition } from '@/features/attributes/attributes.types';
import { CreateAttributeForm } from '@/features/attributes/components/CreateAttributeForm';

export type CustomFieldsSectionProps = {
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
  if (def.scope === 'ORG') return 'Organization';
  return 'Workspace';
}

function ScopeBadge({ def }: { def: AttributeDefinition }) {
  return (
    <span
      className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">{emptyHint}</p>
            ) : (
              <ul className="space-y-1">
                {items.map((def) => {
                  const isVisible = visibleIds.has(def.id);
                  return (
                    <li
                      key={def.id}
                      className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      data-testid={`attr-available-${def.id}`}
                    >
                      {def.locked ? (
                        <span
                          className="flex min-w-0 flex-1 items-start gap-1.5 text-xs text-slate-700 dark:text-slate-200"
                          title={lockTooltip(def)}
                          data-testid={`attr-locked-${def.id}`}
                        >
                          <Lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                          <span className="min-w-0 flex-1 break-words">{def.label}</span>
                          <ScopeBadge def={def} />
                        </span>
                      ) : (
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
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
                        <span className="shrink-0 text-[10px] text-indigo-600 dark:text-indigo-400">
                          Shown
                        </span>
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

export function CustomFieldsSection({
  available,
  visibleIds,
  onToggleColumn,
  onCreated,
  workspaceId,
}: CustomFieldsSectionProps) {
  const { user } = useAuth();
  const isAdmin = isPlatformAdmin(user);
  const [activeTab, setActiveTab] = useState('existing');

  return (
    <div data-testid="custom-fields-section">
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
    </div>
  );
}
