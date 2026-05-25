import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { mapArtifactApiError } from '@/api/mapArtifactApiError';
import type { CustomFieldDefinition, ProjectArtifact, ProjectArtifactItem } from '@/api/project-artifacts.types';
import { useUpdateArtifactItemMutation } from '@/hooks/use-project-artifacts';

import { CustomFieldRenderer } from './CustomFieldRenderer';

type Props = {
  projectId: string;
  artifact: ProjectArtifact;
  item: ProjectArtifactItem;
};

export function ArtifactItemDetailPanel({ projectId, artifact, item }: Props) {
  const [name, setName] = useState(item.name);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>(
    () => ({ ...item.customFieldValues }),
  );
  const pendingRef = useRef<{ name?: string; customFieldValues?: Record<string, unknown> }>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateMutation = useUpdateArtifactItemMutation(projectId, artifact.id);

  useEffect(() => {
    setName(item.name);
    setCustomValues({ ...item.customFieldValues });
    pendingRef.current = {};
  }, [item.id, item.name, item.customFieldValues]);

  const persistPending = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const patch = { ...pendingRef.current };
    if (patch.name === undefined && patch.customFieldValues === undefined) return;
    pendingRef.current = {};
    try {
      await updateMutation.mutateAsync({ itemId: item.id, patch });
    } catch (err) {
      const mapped = mapArtifactApiError(err);
      toast.error(mapped.message);
    }
  }, [item.id, updateMutation]);

  const scheduleSave = useCallback(
    (patch: { name?: string; customFieldValues?: Record<string, unknown> }) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void persistPending();
      }, 500);
    },
    [persistPending],
  );

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed !== item.name) scheduleSave({ name: trimmed });
    void persistPending();
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setCustomValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      scheduleSave({ customFieldValues: next });
      return next;
    });
  };

  const handleFieldsBlur = () => {
    void persistPending();
  };

  const fields = [...artifact.customFieldDefinitions].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="artifact-item-detail">
      <div className="border-b border-slate-100 px-1 pb-3">
        <label htmlFor="artifact-item-name" className="mb-1 block text-xs font-medium text-slate-600">
          Title
        </label>
        <input
          id="artifact-item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-900"
        />
        {updateMutation.isPending ? (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Saving…
          </span>
        ) : null}
      </div>

      {fields.length > 0 ? (
        <div
          className="mt-4 space-y-4"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) handleFieldsBlur();
          }}
        >
          {fields.map((def: CustomFieldDefinition) => (
            <CustomFieldRenderer
              key={def.id}
              definition={def}
              value={customValues[def.id] ?? def.defaultValue ?? ''}
              onChange={handleFieldChange}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No custom fields for this artifact type.</p>
      )}
    </div>
  );
}
