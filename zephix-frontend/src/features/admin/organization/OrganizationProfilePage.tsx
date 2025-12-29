import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/state/AuthContext';
import { Building } from 'lucide-react';

export default function OrganizationProfilePage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string>('Organization');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Use existing org summary endpoint if available
    // For now, use static data or try to fetch from user context
    if (user?.organizationId) {
      // Try to get org name from current user context or make API call
      setOrgName(user.organizationId); // Placeholder
    }
    setLoading(false);
  }, [user]);

  return (
    <div className="p-6" data-testid="admin-org-profile-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building className="h-6 w-6" />
          Organization Profile
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your organization's basic information and settings.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <div className="text-gray-900">{orgName}</div>
              <p className="text-xs text-gray-500 mt-1">
                TODO: Load from organization summary endpoint
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization URL
              </label>
              <div className="text-gray-900">
                {window.location.hostname}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Region
              </label>
              <div className="text-gray-900">US East</div>
              <p className="text-xs text-gray-500 mt-1">
                TODO: Load from organization settings
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

















