import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { useWorkspaceStore } from '@/state/workspace.store';

import { ArtifactTypeCard } from './ArtifactTypeCard';

type Props = {
  open: boolean;
  projectId: string;
  projectName: string;
  /**
   * Workspace UUID the project belongs to. Required for the
   * defensive `setActiveWorkspace` self-heal in `handleCreate`
   * — see Mode D in the Sprint 5.2a hotfix (both-modes) PR.
   * Without this, a race with WorkspaceContextGuard can leave
   * `activeWorkspaceId === null` at click time and the axios
   * request interceptor throws WORKSPACE_REQUIRED pre-flight
   * (zero network request fires).
   */
  workspaceId: string;
  onClose: () => void;
  onCreated?: (artifactId: string) => void;
};

export function ArtifactTypePickerModal({
  open,
  projectId,
  projectName,
  workspaceId,
  onClose,
  onCreated,
}: Props) {
  const navigate = useNavigate();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
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
    // Mode D self-heal: ensure activeWorkspaceId is set right before the
    // mutation so the api.ts request interceptor's WORKSPACE_REQUIRED
    // pre-flight throw can't fire. WorkspaceContextGuard can clear the
    // store between the menu-click that opened the picker and the create
    // click; setting it here closes that race deterministically.
    if (workspaceId) {
      setActiveWorkspace(workspaceId);
    }
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

  // Mode E: render into document.body via portal so the modal escapes
  // the sidebar's stacking context. Pointer-events isolation in Modal.tsx
  // ensures the backdrop and panel are independently click-receptive.
  if (typeof document === 'undefined') return null;

  return createPortal(
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
    </div>,
    document.body,
  );
}
