import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getWorkspace,
  updateWorkspace,
  getMembers,
  removeWorkspaceMember,
  addWorkspaceMember,
  changeWorkspaceRole,
  changeWorkspaceOwner,
  listOrgUsers,
  listWorkspaceMembers,
} from "@/features/workspaces/workspace.api";
import { getPermissions, updatePermissions } from "@/features/workspaces/workspace.api";
import { track } from "@/lib/telemetry";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/state/AuthContext";
import { isWorkspaceMembershipV1Enabled } from "@/lib/flags";

type Props = { workspaceId: string; onClose: () => void; };

export function WorkspaceSettingsModal({ workspaceId, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"general"|"access"|"permissions">("general");
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<'member' | 'viewer'>('member');
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Feature flag check
  const featureEnabled = isWorkspaceMembershipV1Enabled();

  // Determine user permissions
  const userRole = user?.role || 'viewer';
  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const currentMember = members.find(m => (m.userId || m.user?.id || m.id) === user?.id);
  const wsRole = currentMember?.role || currentMember?.user?.role || null;
  const isWorkspaceOwner = wsRole === 'owner' || ws?.ownerId === user?.id;
  const canManageMembers = featureEnabled && (isAdmin || isWorkspaceOwner);

  // Reset to General tab when modal opens
  useEffect(() => {
    setTab("general");
  }, [workspaceId]);

  // Body scroll lock and initial focus
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Set initial focus to close button
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Focus trap: keep focus within modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [loading, tab]);

  // Esc key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [w, m, p, orgUsersList] = await Promise.all([
          getWorkspace(workspaceId),
          listWorkspaceMembers(workspaceId),
          getPermissions(workspaceId),
          listOrgUsers().catch(() => []), // Load org users for member selection
        ]);
        if (!mounted) return;
        setWs(w);
        setMembers(m);
        setMatrix(p);
        setOrgUsers(orgUsersList);
      } catch (error) {
        console.error("Failed to load workspace settings:", error);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [workspaceId]);

  async function onSave() {
    try {
      if (tab === "general" && ws) {
        await updateWorkspace(workspaceId, { name: ws.name, slug: ws.slug, description: ws.description, privacy: ws.privacy });
        track("workspace.settings.saved", { workspaceId });
      }
      if (tab === "permissions" && matrix) {
        await updatePermissions(workspaceId, matrix);
        track("workspace.permissions.updated", { workspaceId });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  if (loading || !ws) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
        <div className="w-[720px] rounded-2xl bg-white p-6 shadow-xl" data-testid="ws-settings-modal">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} className="w-[720px] rounded-2xl bg-white p-6 shadow-xl" data-testid="ws-settings-modal" role="dialog" aria-modal="true" aria-labelledby="ws-settings-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="ws-settings-title" className="text-xl font-semibold">Workspace Settings</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close workspace settings"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant={tab==="general"?"primary":"ghost"} onClick={()=>setTab("general")} data-testid="ws-tab-general">General</Button>
          <Button variant={tab==="access"?"primary":"ghost"} onClick={()=>setTab("access")} data-testid="ws-tab-access">Access</Button>
          <Button variant={tab==="permissions"?"primary":"ghost"} onClick={()=>setTab("permissions")} data-testid="ws-tab-permissions">Permissions</Button>
        </div>

        {tab==="general" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm block mb-1">Name</label>
              <input className="w-full rounded border p-2" value={ws.name || ""} onChange={e=>setWs({...ws, name:e.target.value})}/>
            </div>
            <div>
              <label className="text-sm block mb-1">Slug</label>
              <input className="w-full rounded border p-2" value={ws.slug ?? ""} onChange={e=>setWs({...ws, slug:e.target.value})}/>
            </div>
            <div>
              <label className="text-sm block mb-1">Description</label>
              <textarea className="w-full rounded border p-2" rows={3} value={ws.description ?? ""} onChange={e=>setWs({...ws, description:e.target.value})}/>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">Privacy</span>
              <select className="rounded border p-2" value={ws.privacy ?? (ws.isPrivate ? "private" : "open")} onChange={e=>setWs({...ws, privacy:e.target.value, isPrivate: e.target.value === "private"})} data-testid="ws-privacy">
                <option value="open">Open</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        )}

        {tab==="access" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Members</h3>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/admin/users')}
                    data-testid="ws-invite-new-user"
                  >
                    Manage Users & Invite
                  </Button>
                )}
                {canManageMembers && (
                  <Button
                    data-testid="ws-add-member"
                    onClick={() => setShowAddMemberModal(true)}
                  >
                    Add Existing Member
                  </Button>
                )}
              </div>
            </div>

            {/* Change Owner (Admin only) */}
            {isAdmin && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Workspace Owner</p>
                    <p className="text-xs text-gray-600">
                      {ws?.owner?.email || members.find(m => m.role === 'owner')?.user?.email || 'Not set'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangeOwnerModal(true)}
                    data-testid="ws-change-owner"
                  >
                    Change Owner
                  </Button>
                </div>
              </div>
            )}

            <ul className="divide-y rounded border">
              {members.map(m => {
                const memberUserId = m.userId || m.user?.id || m.id;
                const memberEmail = m.user?.email || m.email;
                const memberName = m.user?.firstName && m.user?.lastName
                  ? `${m.user.firstName} ${m.user.lastName}`
                  : m.name || memberEmail;
                const memberRole = m.role || m.user?.role;
                const canEdit = canManageMembers && memberRole !== 'owner'; // Cannot edit owner role via this UI

                return (
                  <li key={m.id} className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="font-medium">{memberName}</div>
                      <div className="text-xs text-gray-500">{memberEmail}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <select
                          value={memberRole}
                          onChange={async (e) => {
                            const newRole = e.target.value as 'member' | 'viewer';
                            try {
                              await changeWorkspaceRole(workspaceId, memberUserId, newRole);
                              const updated = await listWorkspaceMembers(workspaceId);
                              setMembers(updated);
                              track("workspace.role.changed", { workspaceId, userId: memberUserId, role: newRole });
                            } catch (error) {
                              console.error("Failed to change role:", error);
                              alert("Failed to change role. Please try again.");
                            }
                          }}
                          className="text-xs border rounded px-2 py-1"
                          data-testid={`ws-role-${memberUserId}`}
                        >
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                          {isAdmin && <option value="owner">Owner</option>}
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
                          {memberRole}
                        </span>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async ()=>{
                            if (!confirm(`Remove ${memberName}?`)) return;
                            try {
                              await removeWorkspaceMember(workspaceId, memberUserId);
                              const updated = await listWorkspaceMembers(workspaceId);
                              setMembers(updated);
                              track("workspace.member.removed", { workspaceId, userId: memberUserId });
                            } catch (error) {
                              console.error("Failed to remove member:", error);
                              alert("Failed to remove member. Please try again.");
                            }
                          }}
                          data-testid={`ws-remove-${memberUserId}`}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
              {members.length === 0 && (
                <li className="p-4 text-center text-sm text-gray-500">No members yet</li>
              )}
            </ul>

            {/* Add Member Modal */}
            {showAddMemberModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Add Existing Member</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select User
                      </label>
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Choose a user...</option>
                        {orgUsers
                          .filter(u => !members.some(m => (m.userId || m.user?.id) === u.id))
                          .map(u => (
                            <option key={u.id} value={u.id}>
                              {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email} ({u.email})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as 'member' | 'viewer')}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => {
                      setShowAddMemberModal(false);
                      setSelectedUserId("");
                      setSelectedRole('member');
                    }}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!selectedUserId}
                      onClick={async () => {
                        try {
                          await addWorkspaceMember(workspaceId, selectedUserId, selectedRole);
                          const updated = await listWorkspaceMembers(workspaceId);
                          setMembers(updated);
                          setShowAddMemberModal(false);
                          setSelectedUserId("");
                          setSelectedRole('member');
                          track("workspace.member.added", { workspaceId, userId: selectedUserId, role: selectedRole });
                        } catch (error) {
                          console.error("Failed to add member:", error);
                          alert("Failed to add member. Please try again.");
                        }
                      }}
                    >
                      Add Member
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Change Owner Modal */}
            {showChangeOwnerModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Change Workspace Owner</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select New Owner
                      </label>
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Choose a user...</option>
                        {members
                          .filter(m => (m.userId || m.user?.id))
                          .map(m => {
                            const u = m.user || { id: m.userId, email: m.email };
                            return (
                              <option key={m.id} value={u.id}>
                                {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email} ({u.email})
                              </option>
                            );
                          })}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        The previous owner will be demoted to member.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => {
                      setShowChangeOwnerModal(false);
                      setSelectedUserId("");
                    }}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!selectedUserId}
                      onClick={async () => {
                        try {
                          await changeWorkspaceOwner(workspaceId, selectedUserId);
                          const [updatedWs, updatedMembers] = await Promise.all([
                            getWorkspace(workspaceId),
                            listWorkspaceMembers(workspaceId),
                          ]);
                          setWs(updatedWs);
                          setMembers(updatedMembers);
                          setShowChangeOwnerModal(false);
                          setSelectedUserId("");
                          track("workspace.owner.changed", { workspaceId, newOwnerId: selectedUserId });
                        } catch (error) {
                          console.error("Failed to change owner:", error);
                          alert("Failed to change owner. Please try again.");
                        }
                      }}
                    >
                      Change Owner
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="permissions" && matrix && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Capability</th>
                  <th className="p-2">Owner</th>
                  <th className="p-2">Member</th>
                  <th className="p-2">Viewer</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(matrix.capabilities || {}).map(cap=>(
                  <tr key={cap}>
                    <td className="p-2">{cap}</td>
                    {["owner","member","viewer"].map(role=>(
                      <td className="p-2 text-center" key={role}>
                        <input type="checkbox"
                          data-testid={`ws-perm-${role}-${cap}`}
                          checked={!!(matrix.capabilities?.[cap]?.[role])}
                          onChange={e=>{
                            const next = {...matrix};
                            if (!next.capabilities) next.capabilities = {};
                            if (!next.capabilities[cap]) next.capabilities[cap] = {};
                            next.capabilities[cap][role] = e.target.checked;
                            setMatrix(next);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {(!matrix.capabilities || Object.keys(matrix.capabilities).length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-sm text-gray-500">No permissions configured</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave} data-testid="ws-save">Save</Button>
        </div>
      </div>
    </div>
  );
}

