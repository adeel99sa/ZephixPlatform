import { useState, useEffect } from 'react';
import { TemplateCard } from '@/features/templates/components/TemplateCard';
import { useWorkspaceStore } from '@/state/workspace.store';
import { track } from '@/lib/telemetry';
import { WorkspaceCreateModal } from '@/features/workspaces/WorkspaceCreateModal';
import { applyTemplateWithWorkspace } from '@/features/templates/intent';
import { useUIStore } from '@/stores/uiStore';
import { templatesApi, ProjectTemplate } from '@/services/templates.api';
import { TemplateCreateModal } from '@/components/templates/TemplateCreateModal';

const TEMPLATE_TABS = ['All', 'Workspaces', 'Projects', 'Dashboards', 'Documents', 'Forms'] as const;

export function TemplateCenter() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{id: string, type: string} | null>(null);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { addToast } = useUIStore();

  // Fetch templates from backend
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      addToast({
        type: 'error',
        title: 'Failed to Load Templates',
        message: 'Could not load templates from the server.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateApply = async (templateId: string, templateType: string) => {
    track('template.applied', {
      type: templateType,
      workspaceId: activeWorkspaceId,
      templateId
    });

    try {
      await applyTemplateWithWorkspace({
        templateId,
        type: templateType,
        preferredWorkspaceId: activeWorkspaceId,
        onRequireWorkspace: () => {
          return new Promise<string>((resolve) => {
            setPendingTemplate({ id: templateId, type: templateType });
            setShowWorkspaceModal(true);

            // Store the resolve function to call when workspace is created
            (window as any).__workspaceResolve = resolve;
          });
        }
      });
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const handleCreateTemplate = () => {
    track('tc.create.clicked', {});
    setShowCreateModal(true);
  };

  const handleTemplateCreated = () => {
    loadTemplates();
  };

  const handleEditTemplate = async (id: string) => {
    track('tc.card.edit', { templateId: id });
    addToast({
      type: 'info',
      title: 'Edit Template',
      message: 'Template editing UI will be available in Week 2. For now, you can clone and modify templates.',
    });
  };

  const handleDuplicateTemplate = async (id: string) => {
    track('tc.card.duplicate', { templateId: id });
    try {
      await templatesApi.cloneTemplate(id);
      addToast({
        type: 'success',
        title: 'Template Cloned',
        message: 'Template has been duplicated successfully.',
      });
      loadTemplates();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Clone Failed',
        message: error?.response?.data?.message || 'Failed to clone template',
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    track('tc.card.delete', { templateId: id });
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await templatesApi.deleteTemplate(id);
      addToast({
        type: 'success',
        title: 'Template Deleted',
        message: 'Template has been deleted successfully.',
      });
      loadTemplates();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: error?.response?.data?.message || 'Failed to delete template. System templates cannot be deleted.',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    track('tc.card.setDefault', { templateId: id });
    try {
      await templatesApi.setAsDefault(id);
      addToast({
        type: 'success',
        title: 'Default Set',
        message: 'Template has been set as default.',
      });
      loadTemplates();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed',
        message: error?.response?.data?.message || 'Failed to set default template',
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Center</h1>
          <p className="text-gray-600 mt-2">
            Choose from our collection of templates to quickly set up workspaces, projects, and more.
          </p>
        </div>
        <button
          onClick={handleCreateTemplate}
          data-testid="tc-create"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {TEMPLATE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No templates found.</p>
          <button
            onClick={handleCreateTemplate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              id={template.id}
              title={template.name}
              description={template.description || `Template for ${template.methodology} methodology`}
              type={template.methodology === 'kanban' ? 'project' : template.methodology === 'agile' ? 'project' : 'project'}
              onApply={() => handleTemplateApply(template.id, 'project')}
              onEdit={() => handleEditTemplate(template.id)}
              onDuplicate={() => handleDuplicateTemplate(template.id)}
              onDelete={() => handleDeleteTemplate(template.id)}
              onSetDefault={() => handleSetDefault(template.id)}
            />
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <TemplateCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTemplateCreated}
      />

      <WorkspaceCreateModal
        open={showWorkspaceModal}
        onClose={() => {
          setShowWorkspaceModal(false);
          setPendingTemplate(null);
          // Reject the promise if modal is closed without creating
          if ((window as any).__workspaceResolve) {
            (window as any).__workspaceResolve = null;
          }
        }}
        onCreated={(workspaceId: string) => {
          setActiveWorkspace(workspaceId);
          setShowWorkspaceModal(false);

          // Resolve the promise with the new workspace ID
          if ((window as any).__workspaceResolve) {
            (window as any).__workspaceResolve(workspaceId);
            (window as any).__workspaceResolve = null;
          }

          setPendingTemplate(null);
        }}
      />
    </div>
  );
}
