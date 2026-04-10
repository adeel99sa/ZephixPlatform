/**
 * InviteProjectMemberDialog — Unified member invite from project context menu.
 *
 * Three flows in one popup:
 * 1. Existing org member already in workspace → add to project team only.
 * 2. Existing org member NOT in workspace → add to workspace + project team.
 * 3. New email (not on platform) → invite to org + workspace, then add to
 *    project team once they accept.
 *
 * Opened from the sidebar project "Invite member" menu item.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Mail,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";
import {
  administrationApi,
  type OrgMemberOption,
} from "@/features/administration/api/administration.api";
import { projectsApi } from "@/features/projects/projects.api";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────────────── */

interface InviteProjectMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
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
    description:
      "Full workspace control — manage members, settings, create projects, and all content",
    icon: Shield,
    bg: "bg-blue-100",
    text: "text-blue-600",
  },
  {
    id: "member",
    label: "Member",
    description:
      "Collaborate on workspace content — create documents, work on tasks, but cannot manage members or settings",
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

type SelectedTarget =
  | { kind: "existing"; userId: string; name: string; email: string; alreadyInWorkspace: boolean }
  | { kind: "email"; email: string };

/* ── Component ──────────────────────────────────────────────────── */

export function InviteProjectMemberDialog({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  projectId,
  projectName,
  onSuccess,
}: InviteProjectMemberDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [selectedRole, setSelectedRole] = useState<WsRole>("member");
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [existingWsMemberIds, setExistingWsMemberIds] = useState<Set<string>>(new Set());
  const [existingTeamMemberIds, setExistingTeamMemberIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const roleRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load org members + workspace members + project team on open.
  useEffect(() => {
    if (isOpen && workspaceId && projectId) {
      setIsLoading(true);
      setQuery("");
      setSelectedTarget(null);
      setSelectedRole("member");
      setError(null);
      setRoleOpen(false);
      setShowDropdown(false);

      Promise.all([
        administrationApi.listOrgMembersForAssignment(),
        administrationApi.listWorkspaceMembers(workspaceId),
        projectsApi.getProjectTeam(projectId),
      ])
        .then(([allOrg, wsMembers, projectTeam]) => {
          setOrgMembers(allOrg);
          setExistingWsMemberIds(new Set(wsMembers.map((m) => m.userId)));
          setExistingTeamMemberIds(new Set(projectTeam.teamMemberIds ?? []));
        })
        .catch(() => {
          setOrgMembers([]);
          setExistingWsMemberIds(new Set());
          setExistingTeamMemberIds(new Set());
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, workspaceId, projectId]);

  // Outside click closes dropdowns.
  useEffect(() => {
    if (!roleOpen && !showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (roleOpen && roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
      if (showDropdown && searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [roleOpen, showDropdown]);

  // Filter org members by query — show all, but mark who's already in project team.
  const filteredMembers = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return orgMembers
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, orgMembers]);

  // Check if query looks like a valid email.
  const isEmailQuery = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
  // Check if email already exists in org.
  const emailExistsInOrg = orgMembers.some(
    (m) => m.email.toLowerCase() === query.trim().toLowerCase(),
  );

  /** Add userId to project team (merges with existing). */
  async function addToProjectTeam(userId: string) {
    const current = await projectsApi.getProjectTeam(projectId);
    const currentIds = current.teamMemberIds ?? [];
    if (!currentIds.includes(userId)) {
      await projectsApi.updateProjectTeam(projectId, [...currentIds, userId]);
    }
  }

  async function handleSubmit() {
    if (!selectedTarget) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (selectedTarget.kind === "existing") {
        const { userId, name, alreadyInWorkspace } = selectedTarget;

        // Step 1: Add to workspace if not already a member.
        if (!alreadyInWorkspace) {
          await administrationApi.addWorkspaceMember(workspaceId, {
            userId,
            role: selectedRole,
          });
        }

        // Step 2: Add to project team.
        await addToProjectTeam(userId);

        toast.success(`${name} added to ${projectName}`);
      } else {
        // New email: invite to org + workspace.
        const wsAccessLevel = selectedRole === "viewer" ? "Viewer" : "Member";
        const res = await administrationApi.inviteUsers({
          emails: [selectedTarget.email],
          platformRole: "Member",
          workspaceAssignments: [
            { workspaceId, accessLevel: wsAccessLevel as "Member" | "Viewer" },
          ],
        });
        const result = res.results[0];
        if (result?.status === "error") {
          setError(result.message || "Failed to send invitation");
          return;
        }
        toast.success(`Invitation sent to ${selectedTarget.email}`);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to add member",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelectExisting(member: OrgMemberOption) {
    setSelectedTarget({
      kind: "existing",
      userId: member.id,
      name: member.name,
      email: member.email,
      alreadyInWorkspace: existingWsMemberIds.has(member.id),
    });
    setQuery(member.name);
    setShowDropdown(false);
    setError(null);
  }

  function handleSelectEmail() {
    const email = query.trim();
    setSelectedTarget({ kind: "email", email });
    setShowDropdown(false);
    setError(null);
  }

  function handleInputChange(val: string) {
    setQuery(val);
    setSelectedTarget(null);
    setError(null);
    setShowDropdown(true);
  }

  const activeRole = WORKSPACE_ROLES.find((r) => r.id === selectedRole) ?? WORKSPACE_ROLES[1];
  const ActiveIcon = activeRole.icon;

  // For existing workspace members, role selector is not needed.
  const showRoleSelector =
    !selectedTarget ||
    selectedTarget.kind === "email" ||
    (selectedTarget.kind === "existing" && !selectedTarget.alreadyInWorkspace);

  const canSubmit = !!selectedTarget && !isSubmitting && !isLoading;

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
            Invite member
          </h2>
          <p className="text-sm text-gray-500">
            Add someone to <span className="font-medium text-gray-700">{projectName}</span>
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Search / email input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-500">
            Name or email
          </label>
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => query.trim() && setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectedTarget) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Search by name or type an email..."
                className={`h-10 w-full rounded-xl border bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${
                  error
                    ? "border-red-300 focus:border-red-400"
                    : "border-gray-200 focus:border-blue-500"
                }`}
                disabled={isLoading}
              />
            </div>

            {/* Dropdown results */}
            {showDropdown && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                {isLoading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : (
                  <>
                    {/* Matching org members */}
                    {filteredMembers.map((m) => {
                      const inTeam = existingTeamMemberIds.has(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => !inTeam && handleSelectExisting(m)}
                          disabled={inTeam}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            inTeam
                              ? "cursor-default opacity-50"
                              : "hover:bg-blue-50"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {m.name}
                            </p>
                            <p className="truncate text-xs text-gray-500">{m.email}</p>
                          </div>
                          {inTeam && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                              Already in project
                            </span>
                          )}
                          {!inTeam && existingWsMemberIds.has(m.id) && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              In workspace
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Invite by email option */}
                    {isEmailQuery && !emailExistsInOrg && (
                      <button
                        type="button"
                        onClick={handleSelectEmail}
                        className="flex w-full items-center gap-3 border-t border-gray-100 px-3 py-2.5 text-left transition-colors hover:bg-blue-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Invite <span className="text-blue-600">{query.trim()}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Send invitation email — they'll join as org Member
                          </p>
                        </div>
                      </button>
                    )}

                    {/* No results hint */}
                    {filteredMembers.length === 0 && !isEmailQuery && (
                      <div className="px-3 py-3 text-sm text-gray-500">
                        No matching members.{" "}
                        <span className="text-gray-400">
                          Type a full email to invite someone new.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Selection chip */}
          {selectedTarget && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm">
              {selectedTarget.kind === "existing" ? (
                <>
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedTarget.name}
                  </span>
                  <span className="text-blue-600">({selectedTarget.email})</span>
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedTarget.email}
                  </span>
                  <span className="text-xs text-blue-500">New invite</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedTarget(null);
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="ml-1 text-blue-400 hover:text-blue-600"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Workspace role selector — only shown when person needs workspace access */}
        {showRoleSelector && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-500">Workspace role</label>
            <div className="relative" ref={roleRef}>
              <button
                type="button"
                onClick={() => setRoleOpen((v) => !v)}
                className={`w-full rounded-xl border bg-gray-50 p-3 text-left transition-all ${
                  roleOpen
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activeRole.bg}`}
                  >
                    <ActiveIcon className={`h-4 w-4 ${activeRole.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {activeRole.label}
                      </span>
                      {activeRole.recommended && (
                        <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                      {activeRole.description}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                      roleOpen ? "rotate-180" : ""
                    }`}
                  />
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
                        onClick={() => {
                          setSelectedRole(role.id);
                          setRoleOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? "bg-gradient-to-r from-blue-50 to-cyan-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${role.bg}`}
                          >
                            <RIcon className={`h-4 w-4 ${role.text}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">
                                {role.label}
                              </span>
                              {role.recommended && (
                                <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {role.description}
                            </p>
                          </div>
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-blue-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Context info */}
        {selectedTarget?.kind === "existing" && selectedTarget.alreadyInWorkspace && (
          <p className="text-xs text-gray-500">
            This person is already in <span className="font-medium">{workspaceName}</span>.
            They will be added to the <span className="font-medium">{projectName}</span> project team.
          </p>
        )}
        {selectedTarget?.kind === "existing" && !selectedTarget.alreadyInWorkspace && (
          <p className="text-xs text-gray-500">
            This person will be added to <span className="font-medium">{workspaceName}</span> as{" "}
            <span className="font-medium">{activeRole.label}</span> and to the{" "}
            <span className="font-medium">{projectName}</span> project team.
          </p>
        )}
        {selectedTarget?.kind === "email" && (
          <p className="text-xs text-gray-500">
            This person will receive an invitation email. They will join the
            organization as <span className="font-medium">Member</span>,{" "}
            <span className="font-medium">{workspaceName}</span> as{" "}
            <span className="font-medium">{activeRole.label}</span>, and be added
            to <span className="font-medium">{projectName}</span> once they accept.
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {selectedTarget?.kind === "email" ? "Send invite" : "Add to project"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
