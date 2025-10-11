import React, { useState } from 'react';
import { api } from '../../services/api';

interface InviteResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onResourceInvited: (resource: any) => void;
}

export const InviteResourceModal: React.FC<InviteResourceModalProps> = ({
  isOpen, onClose, projectId, onResourceInvited
}) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    resourceType: 'full_member' as 'full_member' | 'guest' | 'external',
    weeklyCapacity: 40,
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/resources/invite', {
        ...formData,
        projectId,
      });
      onResourceInvited(response.data);
      onClose();
      // Reset form
      setFormData({
        email: '',
        name: '',
        resourceType: 'full_member',
        weeklyCapacity: 40,
        message: '',
      });
    } catch (error: any) {
      console.error('Failed to invite resource:', error);
      setError(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Access Type</label>
            <select
              value={formData.resourceType}
              onChange={(e) => setFormData({...formData, resourceType: e.target.value as any})}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="full_member">Full Member (Login access)</option>
              <option value="guest">Guest (Email updates only)</option>
              <option value="external">External (No access, tracking only)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.resourceType === 'full_member' && 'Can log in and update tasks'}
              {formData.resourceType === 'guest' && 'Receives email notifications, no login'}
              {formData.resourceType === 'external' && 'For tracking vendor/contractor time'}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Weekly Capacity (hours)</label>
            <input
              type="number"
              value={formData.weeklyCapacity}
              onChange={(e) => setFormData({...formData, weeklyCapacity: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="168"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Message (optional)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add a personal message to the invitation..."
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

