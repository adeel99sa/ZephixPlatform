import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { mapArtifactApiError } from '@/api/mapArtifactApiError';
import type { CustomFieldDefinition, ProjectArtifact, ProjectArtifactItem } from '@/api/project-artifacts.types';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useUpdateArtifactItemMutation } from '@/hooks/use-project-artifacts';
import { projectsApi } from '@/features/projects/projects.api';
import type { AssigneeOption } from '@/features/projects/components/AssigneePicker';
import { useAuth } from '@/state/AuthContext';
import { ArtifactFieldProvider } from '@/features/artifacts/context/ArtifactFieldContext';

import { Input } from '@/components/ui/input/Input';

import { CustomFieldRenderer } from './CustomFieldRenderer';

type Props = {
  projectId: string;
  artifact: ProjectArtifact;
  item: ProjectArtifactItem;
};

export function ArtifactItemDetailPanel({ projectId, artifact, item }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(item.name);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>(
    () => ({ ...item.customFieldValues }),
  );
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
  const pendingRef = useRef<{ name?: string; customFieldValues?: Record<string, unknown> }>({});

  const updateMutation = useUpdateArtifactItemMutation(projectId, artifact.id);

  useEffect(() => {
    setName(item.name);
    setCustomValues({ ...item.customFieldValues });
    pendingRef.current = {};
  }, [item.id, item.name, item.customFieldValues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const team = await projectsApi.getProjectTeam(projectId);
        if (cancelled) return;
        setAssigneeOptions(
          team.teamMemberIds.map((id) => ({ id, name: id })),
        );
      } catch {
        if (!cancelled) setAssigneeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const flushPersist = useCallback(async () => {
    const patch = { ...pendingRef.current };
    if (patch.name === undefined && patch.customFieldValues === undefined) return;
    pendingRef.current = {};
    try {
      await updateMutation.mutateAsync({ itemId: item.id, patch });
    } catch (err) {
      const mapped = mapArtifactApiError(err);
      toast.error(mapped.message);
      setName(item.name);
      setCustomValues({ ...item.customFieldValues });
    }
  }, [item.id, item.name, item.customFieldValues, updateMutation]);

  const debouncedPersist = useDebouncedCallback(() => {
    void flushPersist();
  }, 500);

  const scheduleSave = useCallback(
    (patch: { name?: string; customFieldValues?: Record<string, unknown> }) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      debouncedPersist();
    },
    [debouncedPersist],
  );

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed !== item.name) scheduleSave({ name: trimmed });
    void flushPersist();
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setCustomValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      scheduleSave({ customFieldValues: next });
      return next;
    });
  };

  const handleFieldsBlur = () => {
    void flushPersist();
  };

  const fields = [...artifact.customFieldDefinitions].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  return (
    <ArtifactFieldProvider
      value={{ assigneeOptions, currentUserId: user?.id ?? null }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="artifact-item-detail">
        <div className="border-b border-slate-100 px-1 pb-3">
          <InputSection
            name={name}
            onNameChange={setName}
            onNameBlur={handleNameBlur}
            isSaving={updateMutation.isPending}
          />
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
    </ArtifactFieldProvider>
  );
}

function InputSection({
  name,
  onNameChange,
  onNameBlur,
  isSaving,
}: {
  name: string;
  onNameChange: (v: string) => void;
  onNameBlur: () => void;
  isSaving: boolean;
}) {
  return (
    <div>
      <Input
        id="artifact-item-name"
        label="Title"
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onBlur={onNameBlur}
      />
      {isSaving ? (
        <span
          className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Saving…
        </span>
      ) : null}
    </div>
  );
}
