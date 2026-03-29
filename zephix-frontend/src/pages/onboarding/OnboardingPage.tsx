import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createWorkspace } from '@/features/workspaces/api';
import { createProject } from '@/features/projects/api';
import { createTask } from '@/features/work-management/workTasks.api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { onboardingApi } from '@/services/onboardingApi';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';

const LAST_WORKSPACE_KEY = 'zephix.lastWorkspaceId';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const steps = [
  { id: 'workspace', title: 'Create workspace' },
  { id: 'project', title: 'Create project' },
  { id: 'task', title: 'Create first task' },
] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setActiveWorkspace } = useWorkspaceStore();
  const { user, refreshMe } = useAuth();
  const organizationId = user?.organizationId;
  const platformRole = user?.platformRole ?? ((user as any)?.role as string | undefined);
  const isAdmin = platformRole === 'ADMIN';
  const [stepIndex, setStepIndex] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [workspaceSlugTouched, setWorkspaceSlugTouched] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const step = steps[stepIndex];
  const progress = useMemo(
    () => ((stepIndex + 1) / steps.length) * 100,
    [stepIndex],
  );

  function goNext() {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleSkip() {
    setSubmitting(true);
    try {
      await onboardingApi.skipOnboarding();
      await refreshMe();
      toast.success('Onboarding skipped');
      navigate('/home', { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to skip onboarding');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWorkspaceCreate() {
    if (!workspaceName.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (!organizationId) {
        const res = await api.post('/workspaces/onboarding', {
          workspaceName: workspaceName.trim(),
        });
        const envelope = res.data as { data?: Record<string, unknown> };
        const payload = (envelope?.data ?? res.data) as {
          workspaceId: string;
          workspaceSlug: string;
        };
        setWorkspaceId(payload.workspaceId);
        setActiveWorkspace(payload.workspaceId);
        try {
          localStorage.setItem(LAST_WORKSPACE_KEY, payload.workspaceId);
        } catch {}
        await refreshMe();
        toast.success('Workspace created');
        goNext();
        return;
      }

      const data = await createWorkspace({
        name: workspaceName.trim(),
        slug: workspaceSlug.trim() || undefined,
      });
      setWorkspaceId(data.workspaceId);
      setActiveWorkspace(data.workspaceId);
      try {
        localStorage.setItem(LAST_WORKSPACE_KEY, data.workspaceId);
      } catch {}
      toast.success('Workspace created');
      goNext();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create workspace');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProjectCreate() {
    if (!workspaceId) {
      toast.error('Workspace is required before creating a project');
      return;
    }
    if (!projectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSubmitting(true);
    try {
      const project = await createProject({
        name: projectName.trim(),
        workspaceId,
      });
      setProjectId(project.id);
      toast.success('Project created');
      goNext();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaskCreate() {
    if (!workspaceId || !projectId) {
      toast.error('Project is required before creating a task');
      return;
    }
    if (!taskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }
    const { activeWorkspaceId } = useWorkspaceStore.getState();
    if (!activeWorkspaceId || activeWorkspaceId !== workspaceId) {
      toast.error('WORKSPACE_REQUIRED');
      return;
    }
    setSubmitting(true);
    try {
      await createTask({
        projectId,
        title: taskTitle.trim(),
      });
      
      // Mark onboarding as complete so user isn't redirected back
      try {
        await onboardingApi.completeOnboarding();
        await refreshMe();
      } catch (err) {
        console.warn('[Onboarding] Failed to mark onboarding complete:', err);
        // Don't block navigation - onboarding data is secondary
      }
      
      toast.success('Setup complete! Welcome to Zephix.');
      navigate(`/projects/${projectId}/plan`, { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  function handleUserOnboardingContinue() {
    onboardingApi
      .completeOnboarding()
      .then(() => refreshMe().catch(() => null))
      .catch(() => null)
      .finally(() => navigate('/home', { replace: true }));
  }

  if (!isAdmin) {
    const title =
      platformRole === 'VIEWER' || platformRole === 'GUEST'
        ? 'Welcome! Here is your viewer onboarding'
        : 'Welcome! Here is your member onboarding';
    const description =
      platformRole === 'VIEWER' || platformRole === 'GUEST'
        ? 'You will have read-only access to shared workspaces and projects. You can skip this and go straight to Home.'
        : 'You can collaborate inside workspaces your admin assigns. You can skip this and go straight to Home.';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm p-8 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{description}</p>
          <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-medium mb-1">What happens next</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Home will show your role-aware state and accessible workspaces.</li>
              <li>You can switch workspaces from the sidebar once assigned.</li>
              <li>This onboarding will not show again after continue or skip.</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="px-4 py-2 border rounded-lg"
            >
              Skip
            </button>
            <button
              onClick={handleUserOnboardingContinue}
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
            >
              Continue to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {stepIndex + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip setup
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {step.id === 'workspace' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Create your workspace</h2>
                <p className="text-gray-600">Name and slug for the workspace</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setWorkspaceName(next);
                      if (!workspaceSlugTouched) {
                        setWorkspaceSlug(slugify(next));
                      }
                    }}
                    placeholder="Engineering"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={workspaceSlug}
                    onChange={(e) => {
                      setWorkspaceSlugTouched(true);
                      setWorkspaceSlug(slugify(e.target.value));
                    }}
                    placeholder="engineering"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleWorkspaceCreate}
                  disabled={submitting || !workspaceName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create workspace'}
                </button>
              </div>
            </div>
          )}

          {step.id === 'project' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Create your project</h2>
                <p className="text-gray-600">Attach it to your workspace</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Website Redesign"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-between">
                <button onClick={goBack} className="px-4 py-2 border rounded-lg">
                  Back
                </button>
                <button
                  onClick={handleProjectCreate}
                  disabled={submitting || !projectName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </div>
          )}

          {step.id === 'task' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Create your first task</h2>
                <p className="text-gray-600">Add a starter task for your project</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Draft project kickoff"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-between">
                <button onClick={goBack} className="px-4 py-2 border rounded-lg">
                  Back
                </button>
                <button
                  onClick={handleTaskCreate}
                  disabled={submitting || !taskTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create task'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


