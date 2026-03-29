import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projectsApi, type ProjectDetail } from '@/features/projects/projects.api';
import { listOrgUsers, listWorkspaceMembers } from '@/features/workspaces/workspace.api';

type OrgUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  platformRole?: string;
};

type WorkspaceMember = {
  id?: string;
  userId?: string;
  user?: {
    id?: string;
  };
};

type SharedAccessLevel = 'project_manager' | 'delivery_owner';

type SharedAssignment = {
  userId: string;
  accessLevel: SharedAccessLevel;
};

type Props = {
  open: boolean;
  projectId: string;
  workspaceId: string;
  projectName: string;
  project: ProjectDetail | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

function getUserDisplayName(user: OrgUser | undefined, fallbackId: string): string {
  if (!user) return `User ${fallbackId}`;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email || `User ${fallbackId}`;
}

function normalizeMemberUserId(member: WorkspaceMember): string | null {
  return member.userId || member.user?.id || member.id || null;
}

export function ProjectShareModal({
  open,
  projectId,
  workspaceId,
  projectName,
  project,
  onClose,
  onChanged,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [candidateLoadFailed, setCandidateLoadFailed] = useState(false);

  const sharedAssignments = useMemo<SharedAssignment[]>(() => {
    const rows: SharedAssignment[] = [];
    if (project?.projectManagerId) {
      rows.push({
        userId: project.projectManagerId,
        accessLevel: 'project_manager',
      });
    }
    if (
      project?.deliveryOwnerUserId &&
      !rows.some((row) => row.userId === project.deliveryOwnerUserId)
    ) {
      rows.push({
        userId: project.deliveryOwnerUserId,
        accessLevel: 'delivery_owner',
      });
    }
    return rows;
  }, [project?.projectManagerId, project?.deliveryOwnerUserId]);

  const workspaceMemberIds = useMemo(() => {
    const ids = new Set<string>();
    workspaceMembers.forEach((member) => {
      const id = normalizeMemberUserId(member);
      if (id) ids.add(id);
    });
    return ids;
  }, [workspaceMembers]);

  const sharedUserIds = useMemo(() => {
    return new Set(sharedAssignments.map((assignment) => assignment.userId));
  }, [sharedAssignments]);

  const nextShareAccessLevel = useMemo<SharedAccessLevel | null>(() => {
    const hasProjectManager = Boolean(project?.projectManagerId);
    const hasDeliveryOwner = Boolean(project?.deliveryOwnerUserId);

    if (!hasProjectManager && !hasDeliveryOwner) return 'delivery_owner';
    if (!hasProjectManager && hasDeliveryOwner) return 'project_manager';
    if (hasProjectManager && !hasDeliveryOwner) return 'delivery_owner';
    return null;
  }, [project?.projectManagerId, project?.deliveryOwnerUserId]);

  const filteredOrgUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orgUsers;
    return orgUsers.filter((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').toLowerCase();
      return user.email.toLowerCase().includes(q) || name.includes(q);
    });
  }, [orgUsers, searchTerm]);

  const selectedIsWorkspaceMember = selectedUserId
    ? workspaceMemberIds.has(selectedUserId)
    : false;
  const selectedAlreadyShared = selectedUserId ? sharedUserIds.has(selectedUserId) : false;
  const canSubmit =
    Boolean(selectedUserId) &&
    !selectedIsWorkspaceMember &&
    !selectedAlreadyShared &&
    !submitting &&
    !candidateLoadFailed &&
    Boolean(nextShareAccessLevel);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    setCandidateLoadFailed(false);
    try {
      const users = await listOrgUsers();
      const members = await listWorkspaceMembers(workspaceId);
      setOrgUsers(Array.isArray(users) ? users : []);
      setWorkspaceMembers(Array.isArray(members) ? members : []);
    } catch (err: any) {
      console.error('Failed to load project share modal data:', err);
      setOrgUsers([]);
      setWorkspaceMembers([]);
      setCandidateLoadFailed(true);
      setError('Unable to load organization users right now. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelectedUserId('');
    setSearchTerm('');
    void loadCandidates();
  }, [open, workspaceId]);

  if (!open) return null;

  const handleShare = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await projectsApi.shareProject(projectId, {
        userId: selectedUserId,
        accessLevel: nextShareAccessLevel || undefined,
      });
      await onChanged();
      window.dispatchEvent(new Event('project:updated'));
      window.dispatchEvent(new Event('workspace:refresh'));
      setSelectedUserId('');
      toast.success('User added to project');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Unable to add user to project. Check permissions and try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    setRemovingUserId(userId);
    setError(null);
    try {
      await projectsApi.unshareProject(projectId, userId);
      await onChanged();
      window.dispatchEvent(new Event('project:updated'));
      window.dispatchEvent(new Event('workspace:refresh'));
      toast.success('User removed from project');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Unable to remove user from project. Check permissions and try again.';
      setError(message);
      toast.error(message);
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Add to Project</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add an existing organization user to <span className="font-medium">{projectName}</span>{' '}
            without granting access to the full workspace.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            This gives the user access only to this project. It does not add them to the
            workspace.
          </p>
        </div>

        <div className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
              Loading users...
            </div>
          ) : (
            <>
              {candidateLoadFailed && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-sm text-amber-800">
                    Could not load candidate users. Please try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadCandidates()}
                    className="mt-2 rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="project-share-search" className="text-sm font-medium text-slate-700">
                  Find existing organization user
                </label>
                <input
                  id="project-share-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Search by name or email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="project-share-user" className="text-sm font-medium text-slate-700">
                  User selector
                </label>
                <select
                  id="project-share-user"
                  data-testid="project-share-user-selector"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select an organization user</option>
                  {filteredOrgUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserDisplayName(user, user.id)} ({user.email})
                    </option>
                  ))}
                </select>
                {!candidateLoadFailed && filteredOrgUsers.length === 0 && (
                  <p className="text-sm text-slate-500">No matching organization users found.</p>
                )}
                {selectedAlreadyShared && (
                  <p className="text-sm text-amber-700">
                    This user already has direct project access.
                  </p>
                )}
                {selectedIsWorkspaceMember && (
                  <p className="text-sm text-amber-700">
                    This user already has workspace access. Project sharing is not needed.
                  </p>
                )}
                {!nextShareAccessLevel && (
                  <p className="text-sm text-amber-700">
                    No project share slots are available for this project.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">Current project-only shared users</p>
            {sharedAssignments.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">No users have been shared to this project.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {sharedAssignments.map((assignment) => {
                  const user = orgUsers.find((row) => row.id === assignment.userId);
                  const isWorkspaceMember = workspaceMemberIds.has(assignment.userId);
                  return (
                    <li
                      key={`${assignment.accessLevel}-${assignment.userId}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {getUserDisplayName(user, assignment.userId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user?.email || assignment.userId} -{' '}
                          {assignment.accessLevel === 'project_manager'
                            ? 'Project manager slot'
                            : 'Delivery owner slot'}
                          {isWorkspaceMember ? ' - Workspace member access' : ' - Project-only access'}
                        </p>
                      </div>
                      {!isWorkspaceMember && (
                        <button
                          type="button"
                          data-testid={`remove-shared-${assignment.userId}`}
                          onClick={() => handleUnshare(assignment.userId)}
                          disabled={removingUserId === assignment.userId}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {removingUserId === assignment.userId
                            ? 'Removing...'
                            : 'Remove from Project'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!canSubmit || loading}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Adding...' : 'Add to Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

