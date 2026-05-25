import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { mapArtifactApiError } from '@/api/mapArtifactApiError';
import type { BuiltInArtifactTypeId } from '@/features/artifacts/constants/artifactTypes.constants';
import {
  BUILTIN_ARTIFACT_TYPES,
  artifactTypeLabel,
} from '@/features/artifacts/constants/artifactTypes.constants';
import { useCreateProjectArtifact } from '@/hooks/use-project-artifacts';
import { Modal } from '@/components/ui/overlay/Modal';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';

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
  const [selectedType, setSelectedType] = useState<BuiltInArtifactTypeId>('risk_register');
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const createMutation = useCreateProjectArtifact(open ? projectId : undefined);

  useEffect(() => {
    if (!open) return;
    setSelectedType('risk_register');
    setName('');
    setSearch('');
  }, [open, projectId]);

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BUILTIN_ARTIFACT_TYPES;
    return BUILTIN_ARTIFACT_TYPES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [search]);

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
    <div data-testid="artifact-type-picker-modal">
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Add artifact"
      size="lg"
      contentClassName="flex max-h-[70vh] flex-col gap-0 p-0"
    >
      <div className="space-y-4 px-6 pt-2">
        <p className="text-sm text-slate-600">
          Choose a type for <span className="font-medium text-slate-800">{projectName}</span>.
          Defaults are pre-configured; you can rename before creating.
        </p>

        <Input
          type="search"
          placeholder="Search artifact types…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search artifact types"
          data-testid="artifact-type-picker-search"
        />

        <div role="radiogroup" aria-label="Artifact type" className="grid gap-2 sm:grid-cols-2">
          {filteredTypes.length === 0 ? (
            <p className="col-span-2 py-4 text-center text-sm text-slate-500">
              No matching types
            </p>
          ) : (
            filteredTypes.map((meta) => (
              <ArtifactTypeCard
                key={meta.id}
                meta={meta}
                selected={selectedType === meta.id}
                onSelect={() => {
                  setSelectedType(meta.id);
                  if (!name.trim()) setName('');
                }}
              />
            ))
          )}
        </div>

        <Input
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName}
          maxLength={255}
          data-testid="artifact-create-name"
        />
      </div>

      <div className="mt-auto border-t border-slate-100 px-6 py-3">
        <p className="mb-3 text-center text-xs text-slate-500">
          More artifact templates coming soon
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending || filteredTypes.length === 0}
            onClick={() => void handleCreate()}
            data-testid="artifact-type-picker-create"
          >
            {createMutation.isPending ? 'Creating…' : 'Create artifact'}
          </Button>
        </div>
      </div>
    </Modal>
    </div>
  );
}
