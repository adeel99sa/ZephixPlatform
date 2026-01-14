import { useState, useEffect } from 'react';
import { adminApi } from '@/services/adminApi';
import { listWorkspaces } from '@/features/workspaces/api';
import { Mail, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
};

type WorkspaceAssignment = {
  workspaceId: string;
  accessLevel: 'Member' | 'Guest';
};

export default function AdminInvitePage() {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [platformRole, setPlatformRole] = useState<'Member' | 'Guest'>('Member');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceAssignments, setWorkspaceAssignments] = useState<WorkspaceAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [success, setSuccess] = useState(false);
  const [results, setResults] = useState<Array<{ email: string; status: 'success' | 'error'; message?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (trimmed && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    try {
      setLoadingWorkspaces(true);
      const ws = await listWorkspaces();
      setWorkspaces(ws);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoadingWorkspaces(false);
    }
  }

  function toggleWorkspaceAssignment(workspaceId: string) {
    const existing = workspaceAssignments.find(a => a.workspaceId === workspaceId);
    if (existing) {
      setWorkspaceAssignments(workspaceAssignments.filter(a => a.workspaceId !== workspaceId));
    } else {
      // PROMPT 9: Guest platformRole forces Guest access level
      const accessLevel = platformRole === 'Guest' ? 'Guest' : 'Member';
      setWorkspaceAssignments([...workspaceAssignments, { workspaceId, accessLevel }]);
    }
  }

  function updateWorkspaceAccessLevel(workspaceId: string, accessLevel: 'Member' | 'Guest') {
    setWorkspaceAssignments(workspaceAssignments.map(a =>
      a.workspaceId === workspaceId ? { ...a, accessLevel } : a
    ));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.length === 0) {
      setError('Please add at least one email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // PROMPT 9: Call new admin invite endpoint with workspace assignments
      const response = await adminApi.inviteUsers({
        emails,
        platformRole,
        workspaceAssignments: workspaceAssignments.length > 0 ? workspaceAssignments : undefined,
      });

      // Handle results
      if (response?.data?.results) {
        setResults(response.data.results);
        const allSuccess = response.data.results.every(r => r.status === 'success');
        setSuccess(allSuccess);
        if (allSuccess) {
          setEmails([]);
          setWorkspaceAssignments([]);
          setTimeout(() => {
            setSuccess(false);
            setResults([]);
          }, 5000);
        }
      } else {
        setSuccess(true);
        setEmails([]);
        setWorkspaceAssignments([]);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invite Users</h1>
        <p className="text-gray-500 mt-1">Send invitations to new team members</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Invitations sent successfully!</p>
          </div>
          {results.length > 0 && (
            <div className="mt-2 space-y-1">
              {results.map((result, idx) => (
                <p key={idx} className={`text-sm ${result.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {result.email}: {result.message || result.status}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Addresses
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              placeholder="Enter email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addEmail}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {emails.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PROMPT 9: Platform Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform Role
          </label>
          <select
            value={platformRole}
            onChange={(e) => {
              const newRole = e.target.value as 'Member' | 'Guest';
              setPlatformRole(newRole);
              // PROMPT 9: Guest forces Guest access level for all assignments
              if (newRole === 'Guest') {
                setWorkspaceAssignments(workspaceAssignments.map(a => ({ ...a, accessLevel: 'Guest' })));
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Member">Member</option>
            <option value="Guest">Guest</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Member: Can create and manage work. Guest: Read-only access.
          </p>
        </div>

        {/* PROMPT 9: Workspace Assignments */}
        {!loadingWorkspaces && workspaces.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Assignments (Optional)
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Assign users to workspaces with access levels. If not assigned, users can be added to workspaces later.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {workspaces.map(workspace => {
                const assignment = workspaceAssignments.find(a => a.workspaceId === workspace.id);
                const isAssigned = !!assignment;
                return (
                  <div key={workspace.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleWorkspaceAssignment(workspace.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-900">{workspace.name}</span>
                    </div>
                    {isAssigned && (
                      <select
                        value={assignment.accessLevel}
                        onChange={(e) => updateWorkspaceAccessLevel(workspace.id, e.target.value as 'Member' | 'Guest')}
                        disabled={platformRole === 'Guest'}
                        className="text-sm border rounded px-2 py-1 disabled:opacity-50"
                      >
                        <option value="Member">Member</option>
                        <option value="Guest">Guest</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            {platformRole === 'Guest' && workspaceAssignments.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Guest platform role forces Guest access level for all workspace assignments.
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || emails.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : `Send ${emails.length} Invitation${emails.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
