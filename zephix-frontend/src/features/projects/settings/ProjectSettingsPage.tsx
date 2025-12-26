/**
 * Phase 7: Project Settings Page
 * Editable project settings with permission enforcement
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, ProjectDetail, UpdateProjectSettingsDto } from '../../projects/projects.api';
import { Settings, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
// Using native textarea - Textarea component path may vary
import { Select } from '@/components/ui/form/Select';
import { toast } from 'sonner';
import { ProjectStatus, ProjectPriority } from '../../projects/types';
import { useAuth } from '@/state/AuthContext';

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [priority, setPriority] = useState<ProjectPriority>(ProjectPriority.MEDIUM);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedEndDate, setEstimatedEndDate] = useState('');

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

    if (id) {
      loadProject();
    }
  }, [authLoading, user, id]);

  const loadProject = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const projectData = await projectsApi.getProject(id);
      setProject(projectData);
      setName(projectData.name);
      setDescription(projectData.description || '');
      setStatus(projectData.status as ProjectStatus);
      setPriority(projectData.priority as ProjectPriority);
      setStartDate(projectData.startDate ? new Date(projectData.startDate).toISOString().split('T')[0] : '');
      setEndDate(projectData.endDate ? new Date(projectData.endDate).toISOString().split('T')[0] : '');
      setEstimatedEndDate(projectData.estimatedEndDate ? new Date(projectData.estimatedEndDate).toISOString().split('T')[0] : '');
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError(err?.response?.data?.message || 'Failed to load project');
      if (err?.response?.status === 403) {
        toast.error('You do not have permission to view this project');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updates: UpdateProjectSettingsDto = {
        name,
        description,
        status,
        priority,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        estimatedEndDate: estimatedEndDate || undefined,
      };

      await projectsApi.updateProjectSettings(id, updates);
      toast.success('Project settings updated successfully');
      await loadProject();
    } catch (err: any) {
      console.error('Failed to update project:', err);
      toast.error(err?.response?.data?.message || 'Failed to update project settings');
      if (err?.response?.status === 403) {
        toast.error('You do not have permission to update this project');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="project-settings-root">
        <div className="text-center py-12 text-gray-500">Loading project settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="project-settings-root">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading project</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6" data-testid="project-settings-root">
        <div className="text-center py-12 text-gray-500">Project not found</div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="project-settings-root">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${id}/overview`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                options={[
                  { value: ProjectStatus.PLANNING, label: 'Planning' },
                  { value: ProjectStatus.ACTIVE, label: 'Active' },
                  { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
                  { value: ProjectStatus.COMPLETED, label: 'Completed' },
                  { value: ProjectStatus.CANCELLED, label: 'Cancelled' },
                ]}
                placeholder="Select status"
              />
            </div>

            <div>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                options={[
                  { value: ProjectPriority.LOW, label: 'Low' },
                  { value: ProjectPriority.MEDIUM, label: 'Medium' },
                  { value: ProjectPriority.HIGH, label: 'High' },
                  { value: ProjectPriority.CRITICAL, label: 'Critical' },
                ]}
                placeholder="Select priority"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="estimatedEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated End Date
              </label>
              <Input
                id="estimatedEndDate"
                type="date"
                value={estimatedEndDate}
                onChange={(e) => setEstimatedEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Note: Owner assignment and advanced settings will be available in a future update.</p>
      </div>
    </div>
  );
}

