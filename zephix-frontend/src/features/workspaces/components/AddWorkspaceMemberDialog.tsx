/**
 * AddWorkspaceMemberDialog — MVP-3A Addendum.
 *
 * Compact popup to add an existing org member to a specific workspace.
 * Opens from the sidebar "Invite members" and workspace members page.
 * Uses the admin workspace member endpoints via administrationApi.
 *
 * This is WORKSPACE-scoped (assigns workspace roles: Owner/Member/Viewer),
 * NOT the org-level InviteMembersDialog (which invites new people to the
 * platform with platform roles: Admin/Member/Viewer).
 */
import { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import {
  administrationApi,
  type OrgMemberOption,
} from "@/features/administration/api/administration.api";

/* ── Types ──────────────────────────────────────────────────────── */

interface AddWorkspaceMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess?: () => void;
}

type WsRole = "owner" | "member" | "viewer";

const WORKSPACE_ROLES: ReadonlyArray<{
  id: WsRole;
  label: string;
  description: string;
  icon: typeof Shield;
  bg: string;
  text: string;
  recommended?: boolean;
}> = [
  {
    id: "owner",
    label: "Owner",
    description: "Full workspace control — manage members, settings, create projects, and all content",
    icon: Shield,
    bg: "bg-blue-100",
    text: "text-blue-600",
  },
  {
    id: "member",
    label: "Member",
    description: "Collaborate on workspace content — create documents, work on tasks, but cannot manage members or settings",
    icon: Users,
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    recommended: true,
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only access — view workspace projects, tasks, and documents",
    icon: Eye,
    bg: "bg-amber-100",
    text: "text-amber-600",
  },
];

/* ── Component ──────────────────────────────────────────────────── */

export function AddWorkspaceMemberDialog({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
}: AddWorkspaceMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<WsRole>("member");
  const [availableMembers, setAvailableMembers] = useState<OrgMemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load available members on open.
  useEffect(() => {
    if (isOpen && workspaceId) {
      setIsLoading(true);
      setSelectedUserId("");
      setSelectedRole("member");
      setError(null);
      setRoleOpen(false);
      setSearchQuery("");

      Promise.all([
        administrationApi.listOrgMembersForAssignment(),
        administrationApi.listWorkspaceMembers(workspaceId),
      ])
        .then(([orgMembers, wsMembers]) => {
          const existingIds = new Set(wsMembers.map((m) => m.userId));
          setAvailableMembers(orgMembers.filter((om) => !existingIds.has(om.id)));
        })
        .catch(() => setAvailableMembers([]))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, workspaceId]);

  // Outside click closes role dropdown.
  useEffect(() => {
    if (!roleOpen) return;
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [roleOpen]);

  useEffect(() => {
    if (isOpen && !isLoading && !selectedUserId) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, isLoading, selectedUserId]);

  async function handleSubmit() {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await administrationApi.addWorkspaceMember(workspaceId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeRole = WORKSPACE_ROLES.find((r) => r.id === selectedRole) ?? WORKSPACE_ROLES[1];
  const ActiveIcon = activeRole.icon;

  const selectedMember = availableMembers.find((m) => m.id === selectedUserId) ?? null;
  const trimmedQuery = searchQuery.trim();
  const filteredMembers =
    trimmedQuery.length < 2
      ? []
      : availableMembers.filter((m) => {
          const q = trimmedQuery.toLowerCase();
          return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
        });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      className="!border-0 rounded-2xl bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            Add to {workspaceName}
          </h2>
          <p className="text-sm text-gray-500">Add an existing team member to this workspace</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Member select — search-as-you-type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-500">Select member</label>
          {isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : availableMembers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">All org members are already in this workspace.</p>
          ) : selectedMember ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2">
              <MemberAvatar name={selectedMember.name} id={selectedMember.id} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-900">{selectedMember.name}</div>
                <div className="truncate text-xs text-gray-500">{selectedMember.email}</div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedUserId(""); setSearchQuery(""); setError(null); }}
                className="rounded-full p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-700"
                aria-label="Remove selected member"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setError(null); }}
                  placeholder="Search by name or email..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              {trimmedQuery.length >= 2 && (
                <div className="mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                  {filteredMembers.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-gray-500 italic">
                      No members found
                    </p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSelectedUserId(m.id); setError(null); }}
                        className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-gray-50"
                      >
                        <MemberAvatar name={m.name} id={m.id} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-gray-900">
                            {renderHighlighted(m.name, trimmedQuery)}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {renderHighlighted(m.email, trimmedQuery)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Role selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-500">Workspace role</label>
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => setRoleOpen((v) => !v)}
              className={`w-full rounded-xl border bg-gray-50 p-3 text-left transition-all ${
                roleOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activeRole.bg}`}>
                  <ActiveIcon className={`h-4 w-4 ${activeRole.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{activeRole.label}</span>
                    {activeRole.recommended && (
                      <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{activeRole.description}</p>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {roleOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {WORKSPACE_ROLES.map((role) => {
                  const RIcon = role.icon;
                  const selected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => { setSelectedRole(role.id); setRoleOpen(false); }}
                      className={`w-full px-3 py-2.5 text-left transition-colors ${
                        selected ? "bg-gradient-to-r from-blue-50 to-cyan-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${role.bg}`}>
                          <RIcon className={`h-4 w-4 ${role.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{role.label}</span>
                            {role.recommended && (
                              <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{role.description}</p>
                        </div>
                        {selected && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUserId}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to workspace
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function MemberAvatar({ name, id }: { name: string; id: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${paletteFor(id)}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  );
}

function renderHighlighted(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lower.indexOf(lowerQ);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5 text-gray-900">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
