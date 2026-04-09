/**
 * InviteMembersDialog — Design refinement per operator/designer spec.
 *
 * Compact modal (440px) with:
 * - Simple email text input (comma-separated, NOT chip-based)
 * - Rich role selector dropdown (custom, not native <select>)
 * - Zephix blue-cyan gradient branding throughout
 * - High-contrast typography (gray-900 labels, gray-600 descriptions)
 * - No "domain restricted" info box
 * - Two-phase: form → results
 *
 * Uses the existing Modal component. No Dialog/Popover/Select from
 * shadcn (none exist in the Zephix UI library in the required form).
 */
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle,
  ChevronDown,
  Eye,
  Loader2,
  Mail,
  Shield,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import {
  administrationApi,
  type WorkspaceSnapshotRow,
} from "@/features/administration/api/administration.api";

/* ── Types + role config ────────────────────────────────────────── */

interface InviteMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contextLabel?: string;
}

type RoleId = "Admin" | "Member" | "Viewer";

const ROLES: ReadonlyArray<{
  id: RoleId;
  name: string;
  description: string;
  icon: typeof Shield;
  colors: { bg: string; text: string };
  recommended?: boolean;
}> = [
  {
    id: "Admin",
    name: "Admin",
    description:
      "Full platform control — workspaces, people, billing, settings",
    icon: Shield,
    colors: { bg: "bg-blue-100", text: "text-blue-600" },
  },
  {
    id: "Member",
    name: "Member",
    description:
      "Can create, edit, and collaborate in assigned workspaces",
    icon: Users,
    colors: { bg: "bg-emerald-100", text: "text-emerald-600" },
    recommended: true,
  },
  {
    id: "Viewer",
    name: "Viewer",
    description: "Read-only access to shared projects and tasks",
    icon: Eye,
    colors: { bg: "bg-amber-100", text: "text-amber-600" },
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
  const [emails, setEmails] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleId>("Member");
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    [],
  );
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);

  const roleRef = useRef<HTMLDivElement>(null);

  // Reset on open.
  useEffect(() => {
    if (isOpen) {
      setEmails("");
      setSelectedRole("Member");
      setSelectedWorkspaceIds([]);
      setResults(null);
      setError(null);
      setRoleOpen(false);
      administrationApi
        .listWorkspaces()
        .then((ws) => setWorkspaces(ws.filter((w) => w.status === "ACTIVE")))
        .catch(() => setWorkspaces([]));
    }
  }, [isOpen]);

  // Outside click closes role dropdown.
  useEffect(() => {
    if (!roleOpen) return;
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [roleOpen]);

  // ── Submit ──
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit() {
    const parsed = emails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter(Boolean);

    const invalid = parsed.filter((e) => !emailRegex.test(e));
    if (invalid.length > 0) {
      setError(
        `Invalid email${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`,
      );
      return;
    }
    if (parsed.length === 0) {
      setError("Enter at least one email address");
      return;
    }

    setError(null);
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
        emails: parsed,
        platformRole: selectedRole,
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

  function resetForm() {
    setEmails("");
    setSelectedRole("Member");
    setSelectedWorkspaceIds([]);
    setResults(null);
    setError(null);
  }

  function handleDone() {
    onSuccess?.();
    onClose();
  }

  function toggleWorkspace(wsId: string) {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(wsId)
        ? prev.filter((id) => id !== wsId)
        : [...prev, wsId],
    );
  }

  const activeRole = ROLES.find((r) => r.id === selectedRole)!;
  const ActiveIcon = activeRole.icon;

  // ══════════════════════════════════════════════════════════════════
  // RESULTS STATE
  // ══════════════════════════════════════════════════════════════════
  if (results) {
    const successCount = results.filter((r) => r.status === "success").length;
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleDone}
        size="sm"
        showCloseButton={false}
      >
        <div className="space-y-5">
          {/* Success banner */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="mb-1 text-base font-bold text-gray-900">
              Invitations sent
            </h3>
            <p className="text-sm font-medium text-gray-600">
              {successCount} of {results.length} invitation
              {results.length !== 1 ? "s" : ""} sent successfully
            </p>
          </div>

          {/* Per-email results */}
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-gray-900">
                  {r.email}
                </span>
                {r.status === "success" ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Sent
                  </span>
                ) : (
                  <span
                    className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700"
                    title={r.message}
                  >
                    Failed
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={resetForm}>
              Invite more
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg"
              onClick={handleDone}
            >
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      className="rounded-2xl"
    >
      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-sm">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            Invite team members
          </h2>
          <p className="text-sm font-medium text-gray-600">
            to{" "}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text font-bold text-transparent">
              {contextLabel || "Zephix"}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Email input ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-900">
              Email addresses
            </label>
            <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Required
            </span>
          </div>
          <input
            type="text"
            value={emails}
            onChange={(e) => {
              setEmails(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Enter emails, separated by commas"
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${
              error ? "border-red-300 focus:border-red-400" : "border-gray-300 focus:border-blue-500"
            }`}
          />
          {error ? (
            <p className="text-xs font-medium text-red-500">{error}</p>
          ) : (
            <p className="text-xs text-gray-600">
              Press{" "}
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                Enter
              </kbd>{" "}
              to send, or add multiple with commas
            </p>
          )}
        </div>

        {/* ── Role selector ── */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900">
            Role
          </label>
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => setRoleOpen((v) => !v)}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                roleOpen
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeRole.colors.bg}`}
                >
                  <ActiveIcon
                    className={`h-5 w-5 ${activeRole.colors.text}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {activeRole.name}
                    </span>
                    {activeRole.recommended && (
                      <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-gray-600">
                    {activeRole.description}
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                    roleOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {roleOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {ROLES.map((role) => {
                  const RIcon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role.id);
                        setRoleOpen(false);
                      }}
                      className={`w-full p-3 text-left transition-colors ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-50 to-cyan-50"
                          : "hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${role.colors.bg}`}
                        >
                          <RIcon
                            className={`h-5 w-5 ${role.colors.text}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">
                              {role.name}
                            </span>
                            {role.recommended && (
                              <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-gray-600">
                            {role.description}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 shrink-0 text-blue-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Workspace assignment (conditional) ── */}
        {workspaces.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              Add to workspaces{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="max-h-[120px] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-300">
              {workspaces.map((ws) => (
                <label
                  key={ws.workspaceId}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-blue-50/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkspaceIds.includes(ws.workspaceId)}
                    onChange={() => toggleWorkspace(ws.workspaceId)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/20"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {ws.workspaceName}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Members can see all projects within assigned workspaces.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="h-11"
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || emails.trim().length === 0}
            className="h-11 min-w-[160px] bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md transition-shadow hover:shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send invitations"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
