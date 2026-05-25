import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { mapArtifactApiError } from '@/api/mapArtifactApiError';
import type { BuiltInArtifactTypeId } from '@/features/artifacts/constants/artifactTypes.constants';
import {
  BUILTIN_ARTIFACT_TYPES,
  artifactTypeLabel,
} from '@/features/artifacts/constants/artifactTypes.constants';
import { useCreateProjectArtifact } from '@/hooks/use-project-artifacts';

import { ArtifactTypeCard } from './ArtifactTypeCard';

type Props = {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onCreated?: (artifactId: string) => void;
};

export function ArtifactTypePickerModal({
  open,
  projectId,
  projectName,
  onClose,
  onCreated,
}: Props) {
  const navigate = useNavigate();
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<BuiltInArtifactTypeId>('risk_register');
  const [name, setName] = useState('');
  const createMutation = useCreateProjectArtifact(open ? projectId : undefined);

  useEffect(() => {
    if (!open) return;
    setSelectedType('risk_register');
    setName('');
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const defaultName = artifactTypeLabel(selectedType);

  async function handleCreate() {
    const trimmed = name.trim() || defaultName;
    try {
      const created = await createMutation.mutateAsync({
        type: selectedType,
        name: trimmed,
      });
      toast.success(`${trimmed} added to ${projectName}`);
      onCreated?.(created.id);
      onClose();
      navigate(`/projects/${projectId}/artifacts/${created.id}`);
    } catch (err) {
      const mapped = mapArtifactApiError(err);
      toast.error(mapped.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="artifact-type-picker-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            Add artifact
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <p className="text-sm text-slate-600">
            Choose a type for <span className="font-medium text-slate-800">{projectName}</span>.
            Defaults are pre-configured; you can rename before creating.
          </p>

          <div role="radiogroup" aria-label="Artifact type" className="grid gap-2 sm:grid-cols-2">
            {BUILTIN_ARTIFACT_TYPES.map((meta) => (
              <ArtifactTypeCard
                key={meta.id}
                meta={meta}
                selected={selectedType === meta.id}
                onSelect={() => {
                  setSelectedType(meta.id);
                  if (!name.trim()) setName('');
                }}
              />
            ))}
          </div>

          <div>
            <label htmlFor="artifact-create-name" className="mb-1 block text-xs font-medium text-slate-600">
              Name
            </label>
            <input
              ref={nameRef}
              id="artifact-create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              maxLength={255}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => void handleCreate()}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="artifact-type-picker-create"
          >
            {createMutation.isPending ? 'Creating…' : 'Create artifact'}
          </button>
        </div>
      </div>
    </div>
  );
}
