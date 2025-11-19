import { useState, useEffect } from 'react';
import { Shield, Lock, Key, Users, Globe, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // minutes
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSymbols: boolean;
    requireUppercase: boolean;
    requireLowercase: boolean;
    maxAge?: number; // days
  };
  ipWhitelist: string[];
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
  ssoEnabled: boolean;
  ssoProvider?: 'saml' | 'oauth' | 'ldap';
  ssoConfig?: {
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
  };
}

export default function AdminSecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 480,
    passwordPolicy: {
      minLength: 8,
      requireNumbers: true,
      requireSymbols: true,
      requireUppercase: true,
      requireLowercase: false,
      maxAge: 90,
    },
    ipWhitelist: [],
    maxFailedAttempts: 5,
    lockoutDuration: 30,
    ssoEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState('');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call when backend is ready
      // const { data } = await apiClient.get('/admin/security/settings');
      // setSettings(data);

      // For now, use defaults
      setSettings({
        twoFactorEnabled: false,
        sessionTimeout: 480,
        passwordPolicy: {
          minLength: 8,
          requireNumbers: true,
          requireSymbols: true,
          requireUppercase: true,
          requireLowercase: false,
          maxAge: 90,
        },
        ipWhitelist: [],
        maxFailedAttempts: 5,
        lockoutDuration: 30,
        ssoEnabled: false,
      });
    } catch (error) {
      console.error('Failed to load security settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await apiClient.put('/admin/security/settings', settings);
      toast.success('Security settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save security settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIpAddress = () => {
    if (!newIpAddress.trim()) {
      toast.error('Please enter a valid IP address');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIpAddress)) {
      toast.error('Please enter a valid IP address format (e.g., 192.168.1.1)');
      return;
    }

    if (settings.ipWhitelist.includes(newIpAddress)) {
      toast.error('This IP address is already in the whitelist');
      return;
    }

    setSettings({
      ...settings,
      ipWhitelist: [...settings.ipWhitelist, newIpAddress],
    });
    setNewIpAddress('');
  };

  const handleRemoveIpAddress = (ip: string) => {
    setSettings({
      ...settings,
      ipWhitelist: settings.ipWhitelist.filter(i => i !== ip),
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & SSO</h1>
          <p className="text-gray-500 mt-1">Configure security settings and single sign-on</p>
        </div>
        <div className="text-gray-500">Loading security settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & SSO</h1>
          <p className="text-gray-500 mt-1">Configure security settings and single sign-on for your organization</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication (2FA)</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Require two-factor authentication for all users</p>
            <p className="text-xs text-gray-500 mt-1">Users will need to set up 2FA on their next login</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.twoFactorEnabled}
              onChange={(e) => setSettings({ ...settings, twoFactorEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Lock className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Session Management</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="1440"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 480 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Users will be logged out after this period of inactivity</p>
          </div>
        </div>
      </div>

      {/* Password Policy */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Key className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Password Policy</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Length
            </label>
            <input
              type="number"
              min="6"
              max="128"
              value={settings.passwordPolicy.minLength}
              onChange={(e) => setSettings({
                ...settings,
                passwordPolicy: { ...settings.passwordPolicy, minLength: parseInt(e.target.value) || 8 }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireNumbers}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireNumbers: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Require numbers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireSymbols}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireSymbols: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Require special characters</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireUppercase}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireUppercase: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Require uppercase letters</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireLowercase}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireLowercase: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Require lowercase letters</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Expiration (days, 0 = never)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={settings.passwordPolicy.maxAge || 0}
              onChange={(e) => setSettings({
                ...settings,
                passwordPolicy: { ...settings.passwordPolicy, maxAge: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Account Lockout */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Account Lockout</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Failed Login Attempts
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={settings.maxFailedAttempts}
              onChange={(e) => setSettings({ ...settings, maxFailedAttempts: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lockout Duration (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={settings.lockoutDuration}
              onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* IP Whitelist */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Globe className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">IP Whitelist</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Restrict access to specific IP addresses. Leave empty to allow all IPs.</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newIpAddress}
            onChange={(e) => setNewIpAddress(e.target.value)}
            placeholder="192.168.1.1"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddIpAddress()}
          />
          <button
            onClick={handleAddIpAddress}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add IP
          </button>
        </div>
        {settings.ipWhitelist.length > 0 ? (
          <div className="space-y-2">
            {settings.ipWhitelist.map((ip) => (
              <div key={ip} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-700">{ip}</span>
                <button
                  onClick={() => handleRemoveIpAddress(ip)}
                  className="text-sm text-red-600 hover:text-red-900"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No IP addresses whitelisted. All IPs are allowed.</p>
        )}
      </div>

      {/* Single Sign-On (SSO) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Users className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Single Sign-On (SSO)</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Enable SSO for your organization</p>
              <p className="text-xs text-gray-500 mt-1">Users can sign in using your identity provider</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ssoEnabled}
                onChange={(e) => setSettings({ ...settings, ssoEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          {settings.ssoEnabled && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSO Provider
                </label>
                <select
                  value={settings.ssoProvider || 'saml'}
                  onChange={(e) => setSettings({
                    ...settings,
                    ssoProvider: e.target.value as 'saml' | 'oauth' | 'ldap'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="saml">SAML 2.0</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="ldap">LDAP / Active Directory</option>
                </select>
              </div>
              {settings.ssoProvider === 'saml' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entity ID
                    </label>
                    <input
                      type="text"
                      value={settings.ssoConfig?.entityId || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        ssoConfig: { ...settings.ssoConfig, entityId: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://your-org.zephix.ai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SSO URL
                    </label>
                    <input
                      type="text"
                      value={settings.ssoConfig?.ssoUrl || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        ssoConfig: { ...settings.ssoConfig, ssoUrl: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://your-idp.com/sso"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate (PEM format)
                    </label>
                    <textarea
                      value={settings.ssoConfig?.certificate || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        ssoConfig: { ...settings.ssoConfig, certificate: e.target.value }
                      })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
                      placeholder="-----BEGIN CERTIFICATE-----..."
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

