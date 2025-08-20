import React from 'react';
import { Shield, Lock, Clock, FileText, Eye, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/admin/shared/Card';
import { Toggle } from '../../components/admin/shared/Toggle';
import { Button } from '../../components/admin/shared/Button';
import { useAdminSecurity } from '../../hooks/useAdminData';
import { CardSkeleton } from '../../components/admin/shared/SkeletonLoader';
import { ErrorState } from '../../components/admin/shared/ErrorState';

export const Security: React.FC = () => {
  const { settings, loading, error, updateSettings } = useAdminSecurity();

  const handleToggleChange = async (key: keyof typeof settings, value: boolean) => {
    await updateSettings({ [key]: value });
  };

  const handleSessionTimeoutChange = async (hours: number) => {
    await updateSettings({ sessionTimeout: hours });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Security Settings</h1>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load security settings"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Security Settings</h1>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Export Settings
        </Button>
      </div>

      {/* Authentication Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Lock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-medium text-gray-900">Authentication</h2>
        </div>
        
        <div className="space-y-6">
          <Toggle
            enabled={settings.require2FA}
            onChange={(enabled) => handleToggleChange('require2FA', enabled)}
            label="Require Two-Factor Authentication"
            description="All users must enable 2FA to access the system"
          />
          
          <Toggle
            enabled={settings.enableSSO}
            onChange={(enabled) => handleToggleChange('enableSSO', enabled)}
            label="Enable Single Sign-On (SSO)"
            description="Allow users to sign in with their organization's SSO provider"
          />
          
          {settings.enableSSO && (
            <div className="ml-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SSO Provider
              </label>
              <select
                value={settings.ssoProvider}
                onChange={(e) => updateSettings({ ssoProvider: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              >
                <option value="google">Google Workspace</option>
                <option value="azure">Microsoft Azure AD</option>
                <option value="okta">Okta</option>
                <option value="onelogin">OneLogin</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Session Management */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-medium text-gray-900">Session Management</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout
            </label>
            <div className="flex items-center space-x-3">
              <select
                value={settings.sessionTimeout}
                onChange={(e) => handleSessionTimeoutChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              >
                <option value={1}>1 hour</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
              <span className="text-sm text-gray-500">of inactivity</span>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Session timeout warning</p>
                <p>Users will be automatically logged out after {settings.sessionTimeout} hour{settings.sessionTimeout !== 1 ? 's' : ''} of inactivity.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Policies */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-medium text-gray-900">Security Policies</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Policy
            </label>
            <select
              value={settings.passwordPolicy}
              onChange={(e) => updateSettings({ passwordPolicy: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
            >
              <option value="basic">Basic (8+ characters)</option>
              <option value="strong">Strong (12+ characters, mixed case, numbers, symbols)</option>
              <option value="enterprise">Enterprise (16+ characters, no common patterns)</option>
            </select>
          </div>
          
          <Toggle
            enabled={settings.auditLogging}
            onChange={(enabled) => handleToggleChange('auditLogging', enabled)}
            label="Enable Audit Logging"
            description="Log all security-related events for compliance and monitoring"
          />
        </div>
      </Card>

      {/* Security Status */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Eye className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-medium text-gray-900">Security Status</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">A+</div>
            <div className="text-sm text-green-800">Security Score</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <div className="text-sm text-blue-800">Active Sessions</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-sm text-yellow-800">Failed Logins</div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" className="w-full">
            View Security Report
          </Button>
        </div>
      </Card>
    </div>
  );
};

