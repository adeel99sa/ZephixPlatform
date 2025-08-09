import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Settings, 
  Building2, 
  Users, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Mail,
  Save,
  Upload,
  Camera
} from 'lucide-react';

interface OrganizationData {
  id: string;
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  logo?: string;
  timezone: string;
  language: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  projectUpdates: boolean;
  teamInvitations: boolean;
  systemNotifications: boolean;
  weeklyReports: boolean;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  passwordPolicy: 'basic' | 'strong' | 'enterprise';
  sessionTimeout: number;
  allowedDomains: string[];
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Non-profit',
  'Government',
  'Other'
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-1000 employees',
  '1000+ employees'
];

const TIMEZONES = [
  'UTC-12:00 (Baker Island)',
  'UTC-11:00 (American Samoa)',
  'UTC-10:00 (Hawaii)',
  'UTC-09:00 (Alaska)',
  'UTC-08:00 (Pacific)',
  'UTC-07:00 (Mountain)',
  'UTC-06:00 (Central)',
  'UTC-05:00 (Eastern)',
  'UTC-04:00 (Atlantic)',
  'UTC-03:00 (Argentina)',
  'UTC-02:00 (South Georgia)',
  'UTC-01:00 (Azores)',
  'UTC+00:00 (London)',
  'UTC+01:00 (Berlin)',
  'UTC+02:00 (Cairo)',
  'UTC+03:00 (Moscow)',
  'UTC+04:00 (Dubai)',
  'UTC+05:00 (Karachi)',
  'UTC+06:00 (Dhaka)',
  'UTC+07:00 (Bangkok)',
  'UTC+08:00 (Singapore)',
  'UTC+09:00 (Tokyo)',
  'UTC+10:00 (Sydney)',
  'UTC+11:00 (Solomon Islands)',
  'UTC+12:00 (New Zealand)'
];

export const OrganizationSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    id: '1',
    name: 'Acme Corporation',
    description: 'Leading technology solutions provider',
    website: 'https://acme.com',
    industry: 'Technology',
    size: '51-200 employees',
    timezone: 'UTC-05:00 (Eastern)',
    language: 'English'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    projectUpdates: true,
    teamInvitations: true,
    systemNotifications: false,
    weeklyReports: true
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorRequired: false,
    passwordPolicy: 'strong',
    sessionTimeout: 480, // 8 hours in minutes
    allowedDomains: ['acme.com']
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual data loading
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Mock API call - replace with actual save logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Logo file size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      // Mock upload - replace with actual upload logic
      const reader = new FileReader();
      reader.onload = (e) => {
        setOrganizationData(prev => ({
          ...prev,
          logo: e.target?.result as string
        }));
        toast.success('Logo uploaded successfully');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Building2 },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={organizationData.name}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={organizationData.website}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, website: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={organizationData.description}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description of your organization..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={organizationData.industry}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {INDUSTRIES.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Size
            </label>
            <select
              value={organizationData.size}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, size: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {COMPANY_SIZES.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Logo</h3>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {organizationData.logo ? (
              <img src={organizationData.logo} alt="Organization logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4" />
              <span>Upload Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG or GIF up to 5MB. Recommended: 400x400px
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={organizationData.timezone}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {TIMEZONES.map(timezone => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={organizationData.language}
              onChange={(e) => setOrganizationData(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Japanese">Japanese</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-4">
          {Object.entries(notificationSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </div>
                <div className="text-sm text-gray-500">
                  {key === 'emailNotifications' && 'Receive general email notifications'}
                  {key === 'projectUpdates' && 'Get notified about project status changes'}
                  {key === 'teamInvitations' && 'Receive notifications for team member invitations'}
                  {key === 'systemNotifications' && 'System maintenance and update notifications'}
                  {key === 'weeklyReports' && 'Weekly summary reports via email'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Require Two-Factor Authentication</div>
              <div className="text-sm text-gray-500">Require all team members to enable 2FA</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={securitySettings.twoFactorRequired}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  twoFactorRequired: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
        <select
          value={securitySettings.passwordPolicy}
          onChange={(e) => setSecuritySettings(prev => ({
            ...prev,
            passwordPolicy: e.target.value as 'basic' | 'strong' | 'enterprise'
          }))}
          className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="basic">Basic (8+ characters)</option>
          <option value="strong">Strong (12+ characters, mixed case, numbers, symbols)</option>
          <option value="enterprise">Enterprise (16+ characters, all requirements)</option>
        </select>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Settings</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            value={securitySettings.sessionTimeout}
            onChange={(e) => setSecuritySettings(prev => ({
              ...prev,
              sessionTimeout: parseInt(e.target.value) || 480
            }))}
            min="30"
            max="1440"
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Users will be automatically logged out after this period of inactivity
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <Settings className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Organization Settings</h1>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-900 border-r-2 border-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  {activeTab === 'general' && renderGeneralSettings()}
                  {activeTab === 'team' && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Team Management</h3>
                      <p className="text-gray-600 mb-4">Manage your team members and their roles</p>
                      <button
                        onClick={() => navigate('/organizations/team')}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>Go to Team Management</span>
                      </button>
                    </div>
                  )}
                  {activeTab === 'notifications' && renderNotificationSettings()}
                  {activeTab === 'security' && renderSecuritySettings()}
                  {activeTab === 'appearance' && (
                    <div className="text-center py-12">
                      <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Appearance Settings</h3>
                      <p className="text-gray-600">Customize your organization's branding and theme</p>
                      <p className="text-sm text-gray-500 mt-2">Coming soon in a future update</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
