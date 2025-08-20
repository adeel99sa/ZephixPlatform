import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOverview } from '../../hooks/useAdminData';
import { useRoleEnforcement } from '../../hooks/useRoleEnforcement';
import { Card } from '../../components/admin/shared/Card';
import { Skeleton } from '../../components/admin/shared/Skeleton';
import { ErrorState } from '../../components/admin/shared/ErrorState';
import { 
  AlertCircle, 
  Shield, 
  FileText, 
  BarChart3, 
  Activity, 
  Zap,
  CheckCircle,
  TrendingUp,
  HardDrive,
  Users
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useAdminOverview();
  const { uiState } = useRoleEnforcement();

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div>
      <h1 className="text-xl font-medium text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Governance Queue Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/governance/approvals')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">Governance Queue</h3>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Approvals</span>
              <span className="text-lg font-semibold text-gray-900">{data.governance.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">SLA Breaches</span>
              <span className={`text-lg font-semibold ${data.governance.breaches > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.governance.breaches}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <span className="text-sm text-[#2B6CB0] font-medium">View Approvals Queue →</span>
          </div>
        </Card>

        {/* Security Posture Card */}
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            !uiState.showSecurityNav ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => uiState.showSecurityNav && navigate('/admin/security/policies')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">Security Posture</h3>
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Multi-Factor Auth</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                data.security.mfaRequired ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {data.security.mfaRequired ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">SSO Integration</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                data.security.sso ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {data.security.sso ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Sessions</span>
              <span className="text-lg font-semibold text-gray-900">{data.security.activeSessions}</span>
            </div>
          </div>
          
          {uiState.showSecurityNav && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <span className="text-sm text-[#2B6CB0] font-medium">Manage Security →</span>
            </div>
          )}
        </Card>

        {/* Templates Adoption Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/templates')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">Templates Adoption</h3>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Templates</span>
              <span className="text-lg font-semibold text-gray-900">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Projects Using Templates</span>
              <span className="text-lg font-semibold text-gray-900">89%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Out of Date</span>
              <span className="text-lg font-semibold text-yellow-600">3</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <span className="text-sm text-[#2B6CB0] font-medium">Manage Templates →</span>
          </div>
        </Card>

        {/* Usage Overview Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/usage')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">Usage Overview</h3>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <select className="text-xs border rounded px-2 py-1">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Seats Used</span>
              <span className="text-lg font-semibold text-gray-900">{data.users.active} / {data.users.licensed}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AI Credits</span>
                <span className="text-sm text-gray-900">{data.usage.aiUsed} / {data.usage.aiTotal}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#2B6CB0] h-2 rounded-full" 
                  style={{ width: `${(data.usage.aiUsed / data.usage.aiTotal) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Calls (24h)</span>
              <span className="text-lg font-semibold text-gray-900">{data.usage.api24h.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <span className="text-sm text-[#2B6CB0] font-medium">View Analytics →</span>
          </div>
        </Card>

        {/* System Health Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/security/audit')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">System Health</h3>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Uptime (24h)</span>
              <span className="text-lg font-semibold text-green-600">{data.uptimePct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Failed Jobs</span>
              <span className="text-lg font-semibold text-gray-900">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Check</span>
              <span className="text-sm text-gray-600">2 min ago</span>
          </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <span className="text-sm text-[#2B6CB0] font-medium">View Health →</span>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">Quick Actions</h3>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          
          <div className="space-y-3">
            {uiState.showCreateButtons && (
              <>
                <button 
                  className="w-full text-left p-2 text-sm text-[#2B6CB0] hover:bg-[#2B6CB0]/10 rounded"
                  onClick={() => navigate('/admin/users?action=invite')}
                >
                  + Invite User
                </button>
                <button 
                  className="w-full text-left p-2 text-sm text-[#2B6CB0] hover:bg-[#2B6CB0]/10 rounded"
                  onClick={() => navigate('/admin/templates?action=create')}
                >
                  + Create Template
                </button>
              </>
            )}
            <button 
              className="w-full text-left p-2 text-sm text-[#2B6CB0] hover:bg-[#2B6CB0]/10 rounded"
              onClick={() => navigate('/admin/governance/approvals')}
            >
              📋 Open Approvals
            </button>
            {uiState.showDeleteButtons && (
              <button 
                className="w-full text-left p-2 text-sm text-[#2B6CB0] hover:bg-[#2B6CB0]/10 rounded"
                onClick={() => navigate('/admin/security/audit?action=export')}
              >
                📤 Export Audit
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div>
    <Skeleton className="h-8 w-32 mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-3">
            <Skeleton height="h-4" />
            <Skeleton height="h-4" width="w-3/4" />
            <Skeleton height="h-4" width="w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);
