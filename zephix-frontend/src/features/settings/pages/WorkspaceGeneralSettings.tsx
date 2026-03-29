import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { X } from "lucide-react";

import {
  DangerZone,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input/Input";
import { Modal } from "@/components/ui/overlay/Modal";


type WorkspaceGeneralState = {
  workspaceName: string;
  domains: string[];
  domainDraft: string;
};

const INITIAL: WorkspaceGeneralState = {
  workspaceName: "Acme Corp",
  domains: ["app.acme.com"],
  domainDraft: "",
};

function domainsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export default function WorkspaceGeneralSettings(): ReactElement {
  const [state, setState] = useState<WorkspaceGeneralState>(INITIAL);
  const [saved, setSaved] = useState<WorkspaceGeneralState>(INITIAL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  const dirty = useMemo(
    () =>
      state.workspaceName !== saved.workspaceName ||
      !domainsEqual(state.domains, saved.domains),
    [state.workspaceName, state.domains, saved.workspaceName, saved.domains],
  );

  const handleSave = useCallback(() => {
    setSaved({
      workspaceName: state.workspaceName,
      domains: [...state.domains],
      domainDraft: "",
    });
    setState((s) => ({ ...s, domainDraft: "" }));
  }, [state.workspaceName, state.domains]);

  const addDomain = useCallback(() => {
    const next = state.domainDraft.trim().toLowerCase();
    if (!next || state.domains.includes(next)) return;
    setState((s) => ({
      ...s,
      domains: [...s.domains, next],
      domainDraft: "",
    }));
  }, [state.domainDraft, state.domains]);

  const removeDomain = useCallback((d: string) => {
    setState((s) => ({ ...s, domains: s.domains.filter((x) => x !== d) }));
  }, []);

  const deleteEnabled =
    deleteConfirmInput.trim() === state.workspaceName.trim() && state.workspaceName.length > 0;

  const openDeleteModal = useCallback(() => {
    setDeleteConfirmInput("");
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteConfirmInput("");
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteEnabled) return;
    closeDeleteModal();
  }, [deleteEnabled, closeDeleteModal]);

  return (
    <div data-settings-workspace-general>
      <SettingsPageHeader
        title="Workspace Settings"
        description="Local preview only — not the persisted workspace settings flow. Use your workspace’s Settings page for saved changes."
      />

      <SettingsSection title="Workspace Details">
        <SettingsRow
          label="Workspace name"
          description="Shown across the app and in invitations."
          control={
            <Input
              className="w-full min-w-[240px] max-w-sm"
              value={state.workspaceName}
              onChange={(e) =>
                setState((s) => ({ ...s, workspaceName: e.target.value }))
              }
              aria-label="Workspace name"
            />
          }
        />
        <SettingsRow
          label="Workspace logo"
          description="Square image recommended. Uploads are not stored in this preview."
          control={
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium text-slate-400"
                aria-hidden
              >
                Logo
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={() => {
                    /* UI only — no upload in B-2 */
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload (preview)
                </Button>
              </div>
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title="Access & Domains">
        <p className="mb-4 text-sm text-slate-500">
          Restrict sign-in or deep links to approved domains. Enforcement is applied server-side
          when enabled.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            className="max-w-md flex-1"
            placeholder="e.g. team.acme.com"
            value={state.domainDraft}
            onChange={(e) =>
              setState((s) => ({ ...s, domainDraft: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDomain();
              }
            }}
            aria-label="Add domain"
          />
          <Button type="button" variant="secondary" size="md" onClick={addDomain}>
            Add
          </Button>
        </div>
        {state.domains.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Approved domains">
            {state.domains.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-800"
              >
                <span>{d}</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                  aria-label={`Remove ${d}`}
                  onClick={() => removeDomain(d)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </SettingsSection>

      <DangerZone
        title="Delete workspace (preview)"
        description="Preview only — does not delete a real workspace. In this preview, confirming only closes the dialog."
        actionText="Open delete preview"
        onAction={openDeleteModal}
      />

      <footer className="mt-10 flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!dirty} onClick={handleSave}>
          Save locally
        </Button>
      </footer>

      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete workspace (preview)"
        size="sm"
      >
        <p className="text-sm text-slate-600">
          Preview only — no workspace is deleted. Type the sample name exactly to enable the button.
        </p>
        <div className="mt-4">
          <label htmlFor="delete-workspace-confirm" className="sr-only">
            Type sample workspace name to confirm this preview
          </label>
          <Input
            id="delete-workspace-confirm"
            placeholder={state.workspaceName}
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="border border-red-700 !bg-red-600 !text-white hover:!bg-red-700"
            disabled={!deleteEnabled}
            onClick={confirmDelete}
          >
            Close delete preview
          </Button>
        </div>
      </Modal>
    </div>
  );
}
