/**
 * Unified "Invite people" modal — ClickUp-style.
 *
 * - Email input (comma / space separated)
 * - Role selector: Admin, Member, Viewer
 * - Calls administrationApi.inviteUsers()
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Eye, Shield, Users, X } from "lucide-react";
import { administrationApi } from "@/features/administration/api/administration.api";
import { PLATFORM_ROLE, type PlatformRole } from "@/utils/roles";

const ROLE_OPTIONS: Array<{
  id: PlatformRole;
  label: string;
  description: string;
  icon: typeof Shield;
}> = [
  {
    id: PLATFORM_ROLE.MEMBER,
    label: "Member",
    description: "Can access all public items in your Workspace.",
    icon: Users,
  },
  {
    id: PLATFORM_ROLE.VIEWER,
    label: "Viewer",
    description: "Can only view items shared with them.",
    icon: Eye,
  },
  {
    id: PLATFORM_ROLE.ADMIN,
    label: "Admin",
    description: "Can manage Workspaces, People, Billing and other settings.",
    icon: Shield,
  },
];

function parseEmails(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function mapRoleForApi(role: PlatformRole): "Admin" | "Member" | "Guest" {
  if (role === PLATFORM_ROLE.ADMIN) return "Admin";
  if (role === PLATFORM_ROLE.MEMBER) return "Member";
  return "Guest"; // VIEWER maps to Guest on backend
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** @deprecated — invite is handled internally now. Kept for backward compatibility. */
  onInvite?: (userId: string, accessLevel: "Owner" | "Member" | "Guest") => void;
  /** Optional workspace ID — unused by new flow but kept for compat. */
  workspaceId?: string;
  /** Called after a successful invite so the caller can refresh data. */
  onSuccess?: () => void;
};

export function WorkspaceMemberInviteModal({ open, onClose, onSuccess }: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [role, setRole] = useState<PlatformRole>(PLATFORM_ROLE.MEMBER);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find((o) => o.id === role) ?? ROLE_OPTIONS[0],
    [role],
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setEmailInput("");
      setRole(PLATFORM_ROLE.MEMBER);
      setSending(false);
      setErrorText(null);
      setRoleMenuOpen(false);
    }
  }, [open]);

  // Close role menu on outside click
  useEffect(() => {
    if (!roleMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [roleMenuOpen]);

  if (!open) return null;

  async function handleSubmit() {
    const emails = parseEmails(emailInput);
    if (emails.length === 0) {
      setErrorText("Add at least one valid email address.");
      return;
    }

    setSending(true);
    setErrorText(null);
    try {
      const result = await administrationApi.inviteUsers({
        emails,
        platformRole: mapRoleForApi(role),
      });

      const failed = (result?.results ?? []).filter((r) => r.status === "error");
      if (failed.length > 0) {
        setErrorText(failed[0]?.message || "Some invites could not be sent.");
        return;
      }

      setEmailInput("");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setErrorText(error?.message || "Failed to send invites.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pb-2 pt-5">
          <h2 className="text-xl font-semibold text-slate-900">Invite people</h2>
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close invite modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-3">
          {/* Email input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Invite by email
            </label>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email, comma or space separated"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Invite as
            </label>
            <div className="relative" ref={roleMenuRef}>
              {/* Selected role display — clickable to toggle dropdown */}
              <button
                type="button"
                onClick={() => setRoleMenuOpen((prev) => !prev)}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100"
                aria-haspopup="listbox"
                aria-expanded={roleMenuOpen}
              >
                <div className="mt-0.5 rounded-lg bg-slate-200 p-2 text-slate-600">
                  <selectedRole.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {selectedRole.label}
                    </span>
                    {roleMenuOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedRole.description}
                  </p>
                </div>
              </button>

              {/* Role dropdown */}
              {roleMenuOpen && (
                <div className="absolute z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                  {ROLE_OPTIONS.map((option) => {
                    const isSelected = option.id === role;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setRole(option.id);
                          setRoleMenuOpen(false);
                        }}
                        role="option"
                        aria-selected={isSelected}
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900">
                              {option.label}
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-slate-800" />}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Error banner */}
          {errorText && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorText}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
