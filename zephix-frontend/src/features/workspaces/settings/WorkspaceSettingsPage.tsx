import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Users, Shield, Activity } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Tab components (to be implemented)
import GeneralTab from './tabs/GeneralTab';
import MembersTab from './tabs/MembersTab';
import PermissionsTab from './tabs/PermissionsTab';
import ActivityTab from './tabs/ActivityTab';

interface WorkspaceSettings {
  name: string;
  description?: string;
  ownerId?: string;
  visibility: 'public' | 'private';
  defaultMethodology?: string;
  permissionsConfig?: Record<string, string[]>;
}

type TabId = 'general' | 'members' | 'permissions' | 'activity';

export default function WorkspaceSettingsPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Use workspaceId from params or active workspace
  const effectiveWorkspaceId = workspaceId || activeWorkspaceId;

  useEffect(() => {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading) {
      return;
    }
    // Only load if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    if (!effectiveWorkspaceId) {
      toast.error('No workspace selected');
      navigate('/workspaces');
      return;
    }
    loadWorkspaceSettings();
  }, [authLoading, user, effectiveWorkspaceId]);

  const loadWorkspaceSettings = async () => {
    if (!effectiveWorkspaceId) return;
    setLoading(true);
    try {
      const response = await api.get<{ data: WorkspaceSettings | null }>(`/workspaces/${effectiveWorkspaceId}/settings`);
      // Backend returns { data: WorkspaceSettings | null }, extract data field
      const settings = response?.data?.data ?? (response?.data as unknown as WorkspaceSettings);
      if (!settings) {
        toast.error('Workspace not found');
        navigate('/workspaces');
        return;
      }
      setWorkspace(settings);
    } catch (error: any) {
      console.error('Failed to load workspace settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to load workspace settings');
      if (error?.response?.status === 403) {
        navigate('/workspaces');
      }
      setWorkspace(null); // Set null on error
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string; icon: typeof Settings }> = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="p-6" data-testid="ws-settings-root">
        <div className="text-center text-gray-500">Loading workspace settings...</div>
      </div>
    );
  }

  if (!workspace || !effectiveWorkspaceId) {
    return (
      <div className="p-6" data-testid="ws-settings-root">
        <div className="text-center text-red-500">Workspace not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="ws-settings-root">
      {/* Left sub nav */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Workspace Settings</h2>
          <p className="text-xs text-gray-500 mt-1">{workspace.name}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`ws-settings-nav-${tab.id}`}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right content panel */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          {activeTab === 'general' && (
            <GeneralTab
              workspaceId={effectiveWorkspaceId}
              workspace={workspace}
              onUpdate={loadWorkspaceSettings}
            />
          )}
          {activeTab === 'members' && (
            <MembersTab
              workspaceId={effectiveWorkspaceId}
              onUpdate={loadWorkspaceSettings}
            />
          )}
          {activeTab === 'permissions' && (
            <PermissionsTab
              workspaceId={effectiveWorkspaceId}
              permissionsConfig={workspace.permissionsConfig}
              onUpdate={loadWorkspaceSettings}
            />
          )}
          {activeTab === 'activity' && <ActivityTab workspaceId={effectiveWorkspaceId} />}
        </div>
      </main>
    </div>
  );
}













