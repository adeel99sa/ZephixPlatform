import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/services/api';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMembersModal({ isOpen, onClose, onSuccess }: InviteMembersModalProps) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const emailList = emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emailList.length === 0) {
      setError('Please enter at least one valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/users/invite', {
        emails: emailList,
        role
      });
      
      if (response.status === 200 || response.status === 201) {
        setSuccess(`Invitations sent to ${emailList.length} ${emailList.length === 1 ? 'person' : 'people'}`);
        setEmails('');
        
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 1500);
      } else {
        setError('Unexpected response from server');
      }
    } catch (err: any) {
      console.error('Invite members error:', err);
      
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'Failed to send invitations';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Invite Team Members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Addresses <span className="text-red-500">*</span>
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter email addresses separated by commas&#10;e.g., john@example.com, jane@example.com"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate multiple emails with commas
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="member">Member (Can edit)</option>
              <option value="admin">Admin (Full access)</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !emails.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}