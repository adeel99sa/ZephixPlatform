import { useState, useMemo } from 'react';
import { adminApi } from '@/services/adminApi';
import { Mail, Plus, X, CheckCircle2, AlertCircle, Info, Users as UsersIcon } from 'lucide-react';

interface InviteUsersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUsersDrawer({ isOpen, onClose, onSuccess }: InviteUsersDrawerProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<'admin' | 'pm' | 'viewer'>('pm'); // Default to Member
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
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

  const parseEmailInput = (input: string) => {
    // Support comma, space, or line-separated emails
    return input
      .split(/[,\s\n]+/)
      .map(e => e.trim())
      .filter(e => {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return e.length > 0 && emailRegex.test(e);
      });
  };

  const handleEmailInputChange = (value: string) => {
    setEmailInput(value);
    // Auto-parse on paste or comma/space/enter
    if (value.includes(',') || value.includes('\n') || (value.includes(' ') && value.includes('@'))) {
      const parsed = parseEmailInput(value);
      const newEmails = parsed.filter(e => !emails.includes(e));
      if (newEmails.length > 0) {
        setEmails([...emails, ...newEmails]);
        setEmailInput('');
      }
    }
  };

  const invalidEmails = useMemo(() => {
    if (!emailInput.trim()) return [];
    const parts = emailInput.split(/[,\s\n]+/).map(e => e.trim()).filter(Boolean);
    return parts.filter(part => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(part) && part.length > 0;
    });
  }, [emailInput]);

  const roleDescriptions = {
    viewer: 'Read-only access to workspaces and projects',
    pm: 'Can create and manage projects, assign tasks, and view reports',
    admin: 'Full administrative access including user management and billing',
  };

  const roleLabels = {
    viewer: 'Viewer',
    pm: 'Member',
    admin: 'Admin',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.length === 0) {
      setError('Please add at least one email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call invite endpoint (may not be implemented yet, but UI is ready)
      await adminApi.inviteUsers({
        emails,
        role: role === 'pm' ? 'member' : role, // Map pm to member for backend
        message: message || undefined,
      });

      // Success - reset and close
      setEmails([]);
      setMessage('');
      setEmailInput('');
      setError(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations. Please check that the invite endpoint is implemented.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmails([]);
      setEmailInput('');
      setMessage('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Users</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Addresses
            </label>
            <div className="flex gap-2">
              <textarea
                value={emailInput}
                onChange={(e) => handleEmailInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                placeholder="Enter email addresses (comma or line separated)"
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can paste multiple emails separated by commas or new lines
            </p>
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
                      disabled={loading}
                      className="hover:text-blue-900 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Role
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'pm' | 'viewer')}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="viewer">Viewer</option>
                <option value="pm">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    {roleDescriptions[role]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invite Summary */}
          {emails.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <UsersIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Invite Summary</span>
              </div>
              <p className="text-sm text-gray-600">
                You are inviting <span className="font-semibold">{emails.length}</span> user{emails.length !== 1 ? 's' : ''} as{' '}
                <span className="font-semibold">{role === 'pm' ? 'Member' : role === 'admin' ? 'Admin' : 'Viewer'}</span>
              </p>
            </div>
          )}

          {/* Invalid Email Warning */}
          {invalidEmails.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Invalid email addresses</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {invalidEmails.join(', ')} {invalidEmails.length === 1 ? 'is' : 'are'} not valid email addresses
                </p>
              </div>
            </div>
          )}

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welcome Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder="Add a personal message to the invitation..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
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
    </>
  );
}



