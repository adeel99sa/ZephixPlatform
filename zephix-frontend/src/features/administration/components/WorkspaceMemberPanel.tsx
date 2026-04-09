/**
 * WorkspaceMemberPanel — Admin Console MVP-3A.
 *
 * Modal panel for managing workspace members: list, add, change role, remove.
 * All backend endpoints pre-exist (AdminWorkspaceMembersController).
 * Frontend-only component.
 *
 * Per Admin Console Architecture Spec v1 §5.3
 */
import { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/overlay/Modal";
import { Button } from "@/components/ui/button/Button";
import {
  administrationApi,
  type WorkspaceMemberRow,
  type OrgMemberOption,
} from "../api/administration.api";

/* ── Types ──────────────────────────────────────────────────────── */

interface WorkspaceMemberPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

type WsRole = "owner" | "member" | "viewer";

const WORKSPACE_ROLES: ReadonlyArray<{
  id: WsRole;
  label: string;
  description: string;
  bg: string;
  text: string;
  icon: typeof Shield;
}> = [
  { id: "owner", label: "Owner", description: "Full workspace control", bg: "bg-blue-100", text: "text-blue-600", icon: Shield },
  { id: "member", label: "Member", description: "Create, edit, collaborate", bg: "bg-emerald-100", text: "text-emerald-600", icon: Users },
  { id: "viewer", label: "Viewer", description: "Read-only access", bg: "bg-amber-100", text: "text-amber-600", icon: Eye },
];

/* ── RoleDropdown (inline) ──────────────────────────────────────── */

function RoleDropdown({
  value,
  onChange,
}: {
  value: WsRole;
  onChange: (role: WsRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = WORKSPACE_ROLES.find((r) => r.id === value) ?? WORKSPACE_ROLES[1];
  const ActiveIcon = active.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex w-36 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-all ${
          open ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${active.bg}`}>
          <ActiveIcon className={`h-3.5 w-3.5 ${active.text}`} />
        </div>
        <span className="flex-1 font-medium text-gray-900">{active.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {WORKSPACE_ROLES.map((role) => {
            const RIcon = role.icon;
            const selected = value === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => { onChange(role.id); setOpen(false); }}
                className={`w-full px-3 py-2.5 text-left transition-colors ${
                  selected ? "bg-gradient-to-r from-blue-50 to-cyan-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${role.bg}`}>
                    <RIcon className={`h-3.5 w-3.5 ${role.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900">{role.label}</span>
                    <span className="ml-1 text-xs text-gray-500">— {role.description}</span>
                  </div>
                  {selected && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export function WorkspaceMemberPanel({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
}: WorkspaceMemberPanelProps) {
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<WsRole>("member");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Load data ──
  useEffect(() => {
    if (isOpen && workspaceId) {
      setIsLoading(true);
      setSearchQuery("");
      setShowAddMember(false);
      setAddMemberUserId("");
      setAddMemberRole("member");
      setAddError(null);

      Promise.all([
        administrationApi.listWorkspaceMembers(workspaceId),
        administrationApi.listOrgMembersForAssignment(),
      ])
        .then(([memberData, orgData]) => {
          setMembers(memberData);
          setOrgMembers(orgData);
        })
        .catch(() => {
          setMembers([]);
          setOrgMembers([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, workspaceId]);

  // ── Handlers ──
  async function handleAddMember() {
    if (!addMemberUserId) return;
    setIsAdding(true);
    setAddError(null);
    try {
      await administrationApi.addWorkspaceMember(workspaceId, {
        userId: addMemberUserId,
        role: addMemberRole,
      });
      const updated = await administrationApi.listWorkspaceMembers(workspaceId);
      setMembers(updated);
      setShowAddMember(false);
      setAddMemberUserId("");
    } catch (err: any) {
      setAddError(err?.response?.data?.message || err?.message || "Failed to add member");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: WsRole) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    try {
      await administrationApi.updateWorkspaceMemberRole(workspaceId, memberId, newRole);
    } catch {
      const updated = await administrationApi.listWorkspaceMembers(workspaceId);
      setMembers(updated);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!window.confirm(`Remove ${memberName} from ${workspaceName}? They will lose access to all projects in this workspace.`)) return;
    try {
      await administrationApi.removeWorkspaceMember(workspaceId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      const updated = await administrationApi.listWorkspaceMembers(workspaceId);
      setMembers(updated);
    }
  }

  // ── Derived ──
  const filteredMembers = members.filter(
    (m) =>
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const availableMembers = orgMembers.filter(
    (om) => !members.some((wm) => wm.userId === om.id),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton
      className="!border-0 rounded-2xl bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            Members — {workspaceName}
          </h2>
          <p className="text-sm text-gray-500">Manage who has access to this workspace</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-4 mb-3 flex items-center justify-between">
        <Button
          variant="primary"
          size="sm"
          iconLeft={<UserPlus className="h-4 w-4" />}
          onClick={() => setShowAddMember(true)}
        >
          Add member
        </Button>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-48 rounded-lg border border-gray-300 px-3 text-sm placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        />
      </div>

      {/* Add member inline */}
      {showAddMember && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Select member</label>
              <select
                value={addMemberUserId}
                onChange={(e) => setAddMemberUserId(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="">Choose an org member...</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value as WsRole)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddMember}
              loading={isAdding}
              className="h-10"
            >
              Add
            </Button>
            <button
              type="button"
              onClick={() => { setShowAddMember(false); setAddMemberUserId(""); setAddError(null); }}
              className="h-10 px-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          {addError && <p className="mt-2 text-sm text-red-500">{addError}</p>}
        </div>
      )}

      {/* Member table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          {searchQuery ? "No members match your search." : "No members yet. Add someone to get started."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Joined</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleDropdown
                      value={member.role}
                      onChange={(newRole) => handleRoleChange(member.id, newRole)}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {member.createdAt
                      ? new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="rounded p-1 text-gray-400 transition-colors hover:text-red-500"
                      title="Remove from workspace"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-500">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
