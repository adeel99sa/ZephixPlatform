import { useState, useEffect } from 'react';
import { useUpdateTeam, useTeam } from '../hooks/useTeams';
import { X, Users, Palette, Globe, Lock, Building2, Archive } from 'lucide-react';
import { UpdateTeamDto } from '../api/teamsApi';

interface TeamEditDrawerProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TEAM_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Indigo', value: '#6366F1' },
];

export function TeamEditDrawer({ teamId, isOpen, onClose, onSuccess }: TeamEditDrawerProps) {
  const { data: team, isLoading } = useTeam(isOpen ? teamId : null);
  const updateTeam = useUpdateTeam();
  const [formData, setFormData] = useState<UpdateTeamDto>({
    name: '',
    shortCode: '',
    description: '',
    color: TEAM_COLORS[0].value,
    visibility: 'public',
  });

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        shortCode: team.shortCode || '',
        description: team.description || '',
        color: team.color || TEAM_COLORS[0].value,
        visibility: team.visibility,
      });
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      return;
    }

    try {
      await updateTeam.mutateAsync({ id: teamId, updates: formData });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this team?')) return;
    try {
      await updateTeam.mutateAsync({ id: teamId, updates: { status: 'archived' } });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    if (!updateTeam.isPending) {
      onClose();
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleClose} />
        <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-white shadow-xl z-50 flex items-center justify-center">
          <div className="text-gray-500">Loading team...</div>
        </div>
      </>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Team</h2>
          <button
            onClick={handleClose}
            disabled={updateTeam.isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name *
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Short Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short Code
            </label>
            <input
              type="text"
              value={formData.shortCode || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, shortCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  className={`h-10 w-10 rounded-lg border-2 transition-all ${
                    formData.color === color.value
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="space-y-2">
              {[
                { value: 'public', icon: Globe, label: 'Public', desc: 'Visible to all organization members' },
                { value: 'private', icon: Lock, label: 'Private', desc: 'Only team members can see' },
                { value: 'workspace', icon: Building2, label: 'Workspace', desc: 'Visible within assigned workspace' },
              ].map(({ value, icon: Icon, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.visibility === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={formData.visibility === value}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as any }))}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {team.status === 'active' && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={updateTeam.isPending}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={updateTeam.isPending}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTeam.isPending || !formData.name?.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}






