/**
 * InviteMembersDialog — Admin Console MVP-2.1 (designer-grade redesign).
 *
 * Enterprise-quality invite dialog inspired by Linear's chip input,
 * Notion's role clarity, ClickUp's functional depth. Replaces the
 * MVP-2 basic textarea+radio implementation.
 *
 * Uses the existing Modal component (no Dialog/Popover available in
 * the component library). All interactive elements use Zephix brand
 * purple via the existing `bg-primary` / `text-primary` tokens.
 *
 * Features:
 * - Chip-based email input (tokenized, paste-friendly, Enter/comma
 *   to add, Backspace to remove, inline validation)
 * - Rich role selector dropdown with icon, name, description,
 *   permission tags, and 'Recommended' badge
 * - Conditional workspace assignment (hidden when zero workspaces)
 * - Two-phase UI: form → per-email results with "Invite more" loop
 * - Email count badge on submit button
 *
 * Per Admin Console Architecture Spec v1 §5.2.1 + UX/UI designer spec.
 */
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  Eye,
  Info,
  Loader2,
  Mail,
  Shield,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import {
  administrationApi,
  type WorkspaceSnapshotRow,
} from "@/features/administration/api/administration.api";

/* ── Types + config ─────────────────────────────────────────────── */

interface InviteMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Context label shown in header (e.g. workspace name). */
  contextLabel?: string;
}

type RoleId = "Admin" | "Member" | "Viewer";

const ROLES: ReadonlyArray<{
  id: RoleId;
  name: string;
  description: string;
  icon: typeof Shield;
  permissions: string[];
  recommended?: boolean;
  colorClass: string;
}> = [
  {
    id: "Admin",
    name: "Admin",
    description: "Full platform control — workspaces, people, billing, settings",
    icon: Shield,
    permissions: ["All permissions"],
    colorClass: "text-amber-500",
  },
  {
    id: "Member",
    name: "Member",
    description: "Operational access within assigned workspaces",
    icon: User,
    permissions: ["Create", "Edit", "Comment"],
    recommended: true,
    colorClass: "text-violet-600",
  },
  {
    id: "Viewer",
    name: "Viewer",
    description: "Read-only access to shared items",
    icon: Eye,
    permissions: ["View only"],
    colorClass: "text-gray-500",
  },
];

type InviteResult = {
  email: string;
  status: "success" | "error";
  message?: string;
};

/* ── Component ──────────────────────────────────────────────────── */

export function InviteMembersDialog({
  isOpen,
  onClose,
  onSuccess,
  contextLabel,
}: InviteMembersDialogProps) {
  // ── Core state ──
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleId>("Member");
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // ── Reset on open + load workspaces ──
  useEffect(() => {
    if (isOpen) {
      setEmailChips([]);
      setInputValue("");
      setSelectedRole("Member");
      setSelectedWorkspaceIds([]);
      setResults(null);
      setEmailError(null);
      setRoleDropdownOpen(false);
      administrationApi
        .listWorkspaces()
        .then((ws) => setWorkspaces(ws.filter((w) => w.status === "ACTIVE")))
        .catch(() => setWorkspaces([]));
    }
  }, [isOpen]);

  // ── Close role dropdown on outside click ──
  useEffect(() => {
    if (!roleDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [roleDropdownOpen]);

  // ── Email chip logic ──
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function addEmail(raw: string) {
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) return;
    if (!emailRegex.test(cleaned)) {
      setEmailError(`"${cleaned}" is not a valid email`);
      return;
    }
    if (emailChips.includes(cleaned)) {
      setEmailError(`"${cleaned}" already added`);
      return;
    }
    setEmailError(null);
    setEmailChips((prev) => [...prev, cleaned]);
  }

  function removeEmail(email: string) {
    setEmailChips((prev) => prev.filter((e) => e !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(inputValue);
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && emailChips.length > 0) {
      removeEmail(emailChips[emailChips.length - 1]);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    pasted
      .split(/[,;\s\n]+/)
      .filter(Boolean)
      .forEach(addEmail);
    setInputValue("");
  }

  // ── Submit ──
  async function handleSubmit() {
    if (emailChips.length === 0) return;
    setIsSubmitting(true);

    const workspaceAssignments =
      selectedWorkspaceIds.length > 0
        ? selectedWorkspaceIds.map((wsId) => ({
            workspaceId: wsId,
            accessLevel: (selectedRole === "Viewer"
              ? "Viewer"
              : "Member") as "Member" | "Viewer",
          }))
        : undefined;

    try {
      const res = await administrationApi.inviteUsers({
        emails: emailChips,
        platformRole: selectedRole,
        workspaceAssignments,
      });
      setResults(res.results);
    } catch {
      setResults(
        emailChips.map((email) => ({
          email,
          status: "error" as const,
          message: "Failed to send. Try again.",
        })),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setEmailChips([]);
    setInputValue("");
    setSelectedRole("Member");
    setSelectedWorkspaceIds([]);
    setResults(null);
    setEmailError(null);
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

  const activeRole = ROLES.find((r) => r.id === selectedRole)!;

  // ══════════════════════════════════════════════════════════════════
  // SUCCESS STATE
  // ══════════════════════════════════════════════════════════════════
  if (results) {
    const successCount = results.filter((r) => r.status === "success").length;
    return (
      <Modal isOpen={isOpen} onClose={handleDone} size="sm" showCloseButton={false}>
        <div className="space-y-5">
          {/* Banner */}
          <div className="rounded-xl bg-emerald-50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-gray-900">
              Invites sent successfully
            </h3>
            <p className="text-sm text-gray-500">
              {successCount} of {results.length} invitation
              {results.length !== 1 ? "s" : ""} sent
            </p>
          </div>

          {/* Per-email results */}
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-700">
                  {r.email}
                </span>
                {r.status === "success" ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    Sent
                  </span>
                ) : (
                  <span
                    className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
                    title={r.message}
                  >
                    Failed
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={resetForm}>
              Invite more
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // FORM STATE
  // ══════════════════════════════════════════════════════════════════
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
          <Mail className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            Invite members
          </h2>
          {contextLabel && (
            <p className="text-sm text-gray-500">to {contextLabel}</p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Email chip input ── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Email addresses
          </label>
          <div
            className={`min-h-[80px] rounded-lg border bg-gray-50/50 p-2.5 transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 ${
              emailError ? "border-red-300" : "border-gray-200"
            }`}
            onClick={() => inputRef.current?.focus()}
          >
            <div className="flex flex-wrap gap-1.5">
              {emailChips.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white py-1 pl-2 pr-1 text-sm text-gray-700"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="rounded-full p-0.5 transition-colors hover:bg-gray-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => {
                  if (inputValue.trim()) {
                    addEmail(inputValue);
                    setInputValue("");
                  }
                }}
                placeholder={
                  emailChips.length === 0
                    ? "Enter email addresses, separated by commas"
                    : ""
                }
                className="min-w-[140px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          {emailError ? (
            <p className="text-xs text-red-500">{emailError}</p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block h-1 w-1 rounded-full bg-gray-400" />
              Press Enter or comma to add multiple emails
            </p>
          )}
        </div>

        {/* ── Role selector ── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Organization role
          </label>
          <div className="relative" ref={roleDropdownRef}>
            <button
              type="button"
              onClick={() => setRoleDropdownOpen((v) => !v)}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <activeRole.icon
                    className={`h-4 w-4 ${activeRole.colorClass}`}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {activeRole.name}
                    </div>
                    <div className="max-w-[240px] truncate text-xs text-gray-500">
                      {activeRole.description}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    roleDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {roleDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                {ROLES.map((role, idx) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                      idx !== ROLES.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    } ${selectedRole === role.id ? "bg-gray-50" : ""}`}
                  >
                    <div className="flex w-full items-center gap-2">
                      <role.icon
                        className={`h-4 w-4 ${role.colorClass}`}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {role.name}
                      </span>
                      {role.recommended && (
                        <span className="ml-auto rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 pl-6 text-xs leading-relaxed text-gray-500">
                      {role.description}
                    </p>
                    <div className="mt-2 flex gap-1.5 pl-6">
                      {role.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Workspace assignment (conditional) ── */}
        {workspaces.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Add to workspaces{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="max-h-[120px] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
              {workspaces.map((ws) => (
                <label
                  key={ws.workspaceId}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkspaceIds.includes(ws.workspaceId)}
                    onChange={() => toggleWorkspace(ws.workspaceId)}
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500/20"
                  />
                  <span className="text-sm text-gray-700">
                    {ws.workspaceName}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Members added to a workspace can see all projects within it.
            </p>
          </div>
        )}

        {/* ── Domain note ── */}
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Info className="h-3 w-3 shrink-0" />
          Invitations are restricted to your organization's email domain.
        </p>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || emailChips.length === 0}
            className="min-w-[120px] gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send invites
                {emailChips.length > 0 && (
                  <span className="text-xs opacity-70">
                    ({emailChips.length})
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
