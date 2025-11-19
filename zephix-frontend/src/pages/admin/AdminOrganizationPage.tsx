import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { Building2, Users, FolderKanban, HardDrive, Calendar } from 'lucide-react';

interface OrganizationOverview {
  profile: {
    name: string;
    domain: string;
    industry: string;
    size: string;
    createdAt: string;
    status: string;
  };
  plan: {
    name: string;
    features: string[];
    limits: {
      users: number;
      projects: number;
      storage: string;
    };
    nextBilling: string;
  };
  usage: {
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    projects: {
      total: number;
      active: number;
      completed: number;
    };
    storage: {
      used: string;
      available: string;
    };
  };
}

export default function AdminOrganizationPage() {
  const [overview, setOverview] = useState<OrganizationOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const data = await adminApi.getOrganizationOverview();
      setOverview(data);
    } catch (error) {
      console.error('Failed to load organization overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (!overview) {
    return <div className="text-red-600">Failed to load organization data</div>;
  }

  const InfoCard = ({ title, value, icon: Icon, subtitle }: any) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Overview</h1>
        <p className="text-gray-500 mt-1">Manage your organization settings and view usage</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Organization Name</label>
            <p className="text-gray-900 mt-1">{overview.profile.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Domain</label>
            <p className="text-gray-900 mt-1">{overview.profile.domain}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Industry</label>
            <p className="text-gray-900 mt-1">{overview.profile.industry}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Size</label>
            <p className="text-gray-900 mt-1">{overview.profile.size}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <span className={`inline-block px-2 py-1 rounded text-sm font-medium mt-1 ${
              overview.profile.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {overview.profile.status}
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Created</label>
            <p className="text-gray-900 mt-1">
              {new Date(overview.profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">{overview.plan.name}</p>
          <p className="text-sm text-gray-500 mt-1">
            Next billing: {new Date(overview.plan.nextBilling).toLocaleDateString()}
          </p>
        </div>
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Features:</p>
          <div className="flex flex-wrap gap-2">
            {overview.plan.features.map((feature, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {feature}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">User Limit</p>
            <p className="text-lg font-semibold text-gray-900">{overview.plan.limits.users}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Project Limit</p>
            <p className="text-lg font-semibold text-gray-900">{overview.plan.limits.projects}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Storage</p>
            <p className="text-lg font-semibold text-gray-900">{overview.plan.limits.storage}</p>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard
            title="Users"
            value={`${overview.usage.users.active} / ${overview.usage.users.total}`}
            icon={Users}
            subtitle={`${overview.usage.users.inactive} inactive`}
          />
          <InfoCard
            title="Projects"
            value={`${overview.usage.projects.active} / ${overview.usage.projects.total}`}
            icon={FolderKanban}
            subtitle={`${overview.usage.projects.completed} completed`}
          />
          <InfoCard
            title="Storage"
            value={overview.usage.storage.used}
            icon={HardDrive}
            subtitle={`${overview.usage.storage.available} available`}
          />
        </div>
      </div>
    </div>
  );
}

