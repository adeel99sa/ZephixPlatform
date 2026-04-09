/**
 * InviteMembersDialog — Admin Console MVP-2.
 *
 * Compact popup dialog for inviting new people to the organization.
 * Replaces the `window.prompt("Enter admin email")` in the Users page
 * and the Overview Quick Actions.
 *
 * Per Admin Console Architecture Spec v1 §5.2.1:
 * - Email textarea (comma/newline separated)
 * - Role radio selector (Admin / Member / Viewer with descriptions)
 * - Optional workspace assignment (hidden when zero workspaces)
 * - Domain restriction note
 * - Two-phase UI: form → per-email results display
 *
 * Uses the existing Modal component from `components/ui/overlay/Modal`.
 * Calls existing `administrationApi.inviteUsers()` — no backend changes.
 */
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";
import {
  administrationApi,
  type WorkspaceSnapshotRow,
} from "@/features/administration/api/administration.api";

interface InviteMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type RoleOption = {
  value: "Admin" | "Member" | "Viewer";
  label: string;
  description: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "Admin",
    label: "Admin",
    description: "Full platform control — workspaces, people, billing, settings",
  },
  {
    value: "Member",
    label: "Member",
    description: "Operational access within assigned workspaces",
  },
  {
    value: "Viewer",
    label: "Viewer",
    description: "Read-only access to shared items",
  },
];

type InviteResult = {
  email: string;
  status: "success" | "error";
  message?: string;
};

export function InviteMembersDialog({
  isOpen,
  onClose,
  onSuccess,
}: InviteMembersDialogProps) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"Admin" | "Member" | "Viewer">("Member");
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset on open + load workspaces.
  useEffect(() => {
    if (isOpen) {
      setEmails("");
      setRole("Member");
      setSelectedWorkspaceIds([]);
      setResults(null);
      setErrors([]);
      administrationApi
        .listWorkspaces()
        .then((ws) => setWorkspaces(ws.filter((w) => w.status === "ACTIVE")))
        .catch(() => setWorkspaces([]));
    }
  }, [isOpen]);

  async function handleSubmit() {
    const parsed = emails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter(Boolean);

    // Basic email format check.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = parsed.filter((e) => !emailRegex.test(e));
    if (invalid.length > 0) {
      setErrors(invalid.map((e) => `"${e}" is not a valid email`));
      return;
    }
    if (parsed.length === 0) {
      setErrors(["Enter at least one email address"]);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    const workspaceAssignments =
      selectedWorkspaceIds.length > 0
        ? selectedWorkspaceIds.map((wsId) => ({
            workspaceId: wsId,
            accessLevel: (role === "Viewer" ? "Viewer" : "Member") as
              | "Member"
              | "Viewer",
          }))
        : undefined;

    try {
      const res = await administrationApi.inviteUsers({
        emails: parsed,
        platformRole: role,
        workspaceAssignments,
      });
      setResults(res.results);
    } catch {
      setResults(
        parsed.map((email) => ({
          email,
          status: "error" as const,
          message: "Failed to send. Try again.",
        })),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDone() {
    onSuccess?.();
    onClose();
  }

  function toggleWorkspace(wsId: string) {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(wsId) ? prev.filter((id) => id !== wsId) : [...prev, wsId],
    );
  }

  // ── Results phase ──
  if (results) {
    return (
      <Modal isOpen={isOpen} onClose={handleDone} title="Invitation Results" size="sm">
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.email}
              className="flex items-start gap-2 text-sm"
            >
              {r.status === "success" ? (
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{r.email}</span>
                <span className="ml-1 text-gray-500">
                  — {r.status === "success" ? "Invitation sent" : r.message || "Error"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleDone}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // ── Form phase ──
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite People" size="sm">
      <div className="space-y-5">
        {/* Email addresses */}
        <div>
          <label
            htmlFor="invite-emails"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email addresses
          </label>
          <textarea
            id="invite-emails"
            rows={3}
            value={emails}
            onChange={(e) => {
              setEmails(e.target.value);
              setErrors([]);
            }}
            placeholder="Enter email addresses, separated by commas"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <Info className="h-3 w-3 shrink-0" />
            <span>Invitations are restricted to your organization's email domain.</span>
          </div>
          {errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {errors.map((err) => (
                <p key={err} className="text-xs text-red-600">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Role selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Organization Role
          </label>
          <div className="space-y-2">
            {ROLE_OPTIONS.map((opt) => {
              const selected = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        selected
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-gray-300"
                      }`}
                    >
                      {selected && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {opt.label}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-6 text-xs text-gray-500">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace assignment (conditional) */}
        {workspaces.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Add to workspaces{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {workspaces.map((ws) => (
                <label
                  key={ws.workspaceId}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkspaceIds.includes(ws.workspaceId)}
                    onChange={() => toggleWorkspace(ws.workspaceId)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {ws.workspaceName}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Members added to a workspace can see all projects within it.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || emails.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Invitations
          </button>
        </div>
      </div>
    </Modal>
  );
}
