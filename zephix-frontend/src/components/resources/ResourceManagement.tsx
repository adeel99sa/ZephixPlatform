import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { InviteResourceModal } from './InviteResourceModal';

interface Resource {
  id: string;
  name: string;
  email: string;
  resourceType: 'full_member' | 'guest' | 'external';
  invitationStatus?: 'pending' | 'accepted' | 'declined';
  capacityHoursPerWeek: number;
  isActive: boolean;
  invitedAt?: string;
  acceptedAt?: string;
}

export const ResourceManagement: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
    loadPendingInvitations();
  }, []);

  const loadResources = async () => {
    try {
      const response = await api.get('/resources');
      setResources(response.data.data || []);
    } catch (error) {
      console.error('Failed to load resources:', error);
      setError('Failed to load resources');
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const response = await api.get('/resources/pending');
      setPendingInvitations(response.data.data || []);
    } catch (error) {
      console.error('Failed to load pending invitations:', error);
    }
  };

  const handleResourceInvited = (resource: Resource) => {
    setResources(prev => [resource, ...prev]);
    setPendingInvitations(prev => [resource, ...prev]);
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'full_member': return 'bg-green-100 text-green-800';
      case 'guest': return 'bg-yellow-100 text-yellow-800';
      case 'external': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Resource Management</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          + Invite Team Member
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvitations.map((resource) => (
                <div key={resource.id} className="bg-white p-4 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{resource.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(resource.invitationStatus)}`}>
                      {resource.invitationStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{resource.email}</p>
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${getResourceTypeColor(resource.resourceType)}`}>
                      {resource.resourceType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {resource.invitedAt && new Date(resource.invitedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Resources */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Resources ({resources.length})</h2>
        {resources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No resources found. Invite your first team member to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <div key={resource.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{resource.name}</h3>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getResourceTypeColor(resource.resourceType)}`}>
                      {resource.resourceType.replace('_', ' ')}
                    </span>
                    {resource.invitationStatus && (
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(resource.invitationStatus)}`}>
                        {resource.invitationStatus}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{resource.email}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{resource.capacityHoursPerWeek}h/week</span>
                  <span className={resource.isActive ? 'text-green-600' : 'text-red-600'}>
                    {resource.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {resource.acceptedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Joined: {new Date(resource.acceptedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteResourceModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onResourceInvited={handleResourceInvited}
      />
    </div>
  );
};

