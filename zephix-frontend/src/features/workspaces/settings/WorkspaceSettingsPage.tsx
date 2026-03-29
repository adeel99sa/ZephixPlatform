import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Users, Shield, FileStack } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { request } from '@/lib/api';
import { toast } from 'sonner';
import {
  accessDecisionFromEntity,
  accessDecisionMessage,
  normalizeAccessDecision,
  redirectToSessionExpiredLogin,
} from '@/lib/api/accessDecision';
import { WorkspaceAccessState } from '@/components/workspace/WorkspaceAccessStates';

// Tab components (to be implemented)
import GeneralTab from './tabs/GeneralTab';
import MembersTab from './tabs/MembersTab';
import PermissionsTab from './tabs/PermissionsTab';
import ActivityTab from './tabs/ActivityTab';
import TemplatesTab from './tabs/TemplatesTab';

interface WorkspaceSettings {
  name: string;
  description?: string;
  ownerId?: string;
  visibility: 'public' | 'private';
  defaultMethodology?: string;
  defaultTemplateId?: string | null;
  inheritOrgDefaultTemplate?: boolean;
  governanceInheritanceMode?: 'ORG_DEFAULT' | 'WORKSPACE_OVERRIDE';
  allowedTemplateIds?: string[] | null;
  permissionsConfig?: Record<string, string[]>;
}

type TabId = 'general' | 'members' | 'permissions' | 'templates';
type SettingsLoadState =
  | 'loading'
  | 'ready'
  | 'forbidden'
  | 'missing'
  | 'unknown_error';

export default function WorkspaceSettingsPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeWorkspaceId,
    setActiveWorkspace,
    clearActiveWorkspace,
  } = useWorkspaceStore();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadState, setLoadState] = useState<SettingsLoadState>('loading');

  // Use workspaceId from params or active workspace
  const effectiveWorkspaceId = workspaceId || activeWorkspaceId;

  useEffect(() => {
    if (!workspaceId) return;
    setActiveWorkspace(workspaceId);
  }, [workspaceId, setActiveWorkspace]);

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
    setLoadState('loading');
    try {
      // `api.get` already unwraps one `data` layer in `src/lib/api.ts`.
      // For this endpoint, resolved value is WorkspaceSettings | null.
      const settings = await request.get<WorkspaceSettings | null>(
        `/workspaces/${effectiveWorkspaceId}/settings`,
      );
      const decision = accessDecisionFromEntity(settings);
      if (decision === 'missing') {
        if (activeWorkspaceId === effectiveWorkspaceId) {
          clearActiveWorkspace();
        }
        window.dispatchEvent(new Event('workspace:refresh'));
        setWorkspace(null);
        setLoadState('missing');
        return;
      }
      setWorkspace(settings);
      setLoadState('ready');
    } catch (error: any) {
      console.error('Failed to load workspace settings:', error);
      const decision = normalizeAccessDecision(error);
      if (decision === 'session_expired') {
        redirectToSessionExpiredLogin();
        return;
      }
      if (decision === 'forbidden') {
        if (activeWorkspaceId === effectiveWorkspaceId) {
          clearActiveWorkspace();
        }
        window.dispatchEvent(new Event('workspace:refresh'));
        setLoadState('forbidden');
      } else if (decision === 'missing') {
        if (activeWorkspaceId === effectiveWorkspaceId) {
          clearActiveWorkspace();
        }
        window.dispatchEvent(new Event('workspace:refresh'));
        setLoadState('missing');
      } else {
        setLoadState('unknown_error');
        toast.error(accessDecisionMessage('unknown_error', 'workspace'));
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
    { id: 'templates', label: 'Templates', icon: FileStack },
  ];

  if (loading) {
    return (
      <div className="p-6" data-testid="ws-settings-root">
        <div className="text-center text-gray-500">Loading workspace settings...</div>
      </div>
    );
  }

  if (loadState === 'forbidden') {
    return <WorkspaceAccessState type="no-access" />;
  }

  if (loadState === 'missing') {
    return <WorkspaceAccessState type="not-found" />;
  }

  if (loadState === 'unknown_error') {
    return (
      <div className="p-6" data-testid="ws-settings-root">
        <div className="text-center text-red-500">
          {accessDecisionMessage('unknown_error', 'workspace')}
        </div>
      </div>
    );
  }

  if (!workspace || !effectiveWorkspaceId) {
    return (
      <div className="p-6" data-testid="ws-settings-root">
        <div className="text-center text-red-500">
          {accessDecisionMessage('missing', 'workspace')}
        </div>
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
          {activeTab === 'templates' && (
            <TemplatesTab
              workspaceId={effectiveWorkspaceId}
              workspaceName={workspace.name}
              currentCustomFieldsCount={0}
            />
          )}
        </div>
      </main>
    </div>
  );
}













