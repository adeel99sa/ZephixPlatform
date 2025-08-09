import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { WorkflowCanvas } from '../components/workflow/WorkflowCanvas';
import { StageEditor } from '../components/workflow/StageEditor';
import { TemplateSettings } from '../components/workflow/TemplateSettings';
import { StageLibrary } from '../components/workflow/StageLibrary';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { WorkflowTemplate, WorkflowStage, CreateWorkflowTemplateRequest, UpdateWorkflowTemplateRequest } from '../types/workflow';
import { workflowTemplateService } from '../services/workflowService';
import { 
  Save, 
  Eye, 
  Settings, 
  Play, 
  ArrowLeft,
  Zap,
  AlertCircle 
} from 'lucide-react';

export const WorkflowTemplateBuilder: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [activeStage, setActiveStage] = useState<WorkflowStage | null>(null);
  const [showStageEditor, setShowStageEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize template
  useEffect(() => {
    if (isEditing && id) {
      loadTemplate(id);
    } else {
      // Create new template
      setTemplate({
        id: '',
        organizationId: '',
        name: 'New Workflow Template',
        description: '',
        type: 'custom',
        configuration: {
          stages: [],
          fields: [],
          integrations: [],
          settings: {
            allowParallelExecution: false,
            autoProgressOnApproval: true,
            requireAllApprovals: false,
            notifyOnStageChange: true,
          },
        },
        isActive: true,
        isDefault: false,
        isPublic: false,
        metadata: {
          version: '1.0.0',
          createdBy: '',
          lastModifiedBy: '',
          tags: [],
          category: '',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [id, isEditing]);

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const loadedTemplate = await workflowTemplateService.getById(templateId);
      setTemplate(loadedTemplate);
    } catch (error) {
      console.error('Failed to load template:', error);
      setErrors(['Failed to load template']);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    const validation = validateTemplate(template);
    if (validation.length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);

      if (isEditing) {
        const updateData: UpdateWorkflowTemplateRequest = {
          name: template.name,
          description: template.description,
          configuration: template.configuration,
          isActive: template.isActive,
          isDefault: template.isDefault,
          isPublic: template.isPublic,
          metadata: template.metadata,
        };
        const updatedTemplate = await workflowTemplateService.update(template.id, updateData);
        setTemplate(updatedTemplate);
      } else {
        const createData: CreateWorkflowTemplateRequest = {
          name: template.name,
          description: template.description,
          type: template.type,
          configuration: template.configuration,
          isActive: template.isActive,
          isDefault: template.isDefault,
          isPublic: template.isPublic,
          metadata: template.metadata,
        };
        const newTemplate = await workflowTemplateService.create(createData);
        setTemplate(newTemplate);
        navigate(`/workflow-templates/${newTemplate.id}/edit`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors(['Failed to save template']);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handleStageClick = (stage: WorkflowStage) => {
    setActiveStage(stage);
    setShowStageEditor(true);
  };

  const handleStageUpdate = (updatedStage: WorkflowStage) => {
    if (!template) return;

    const updatedStages = template.configuration.stages.map(stage =>
      stage.id === updatedStage.id ? updatedStage : stage
    );

    setTemplate({
      ...template,
      configuration: {
        ...template.configuration,
        stages: updatedStages,
      },
    });
  };

  const handleStageAdd = (newStage: Partial<WorkflowStage>) => {
    if (!template) return;

    const stage: WorkflowStage = {
      id: `stage_${Date.now()}`,
      name: newStage.name || 'New Stage',
      type: newStage.type || 'project_phase',
      required: newStage.required ?? true,
      automations: newStage.automations || [],
      approvers: newStage.approvers || [],
      notifications: newStage.notifications || [],
    };

    setTemplate({
      ...template,
      configuration: {
        ...template.configuration,
        stages: [...template.configuration.stages, stage],
      },
    });

    // Auto-open editor for new stage
    setActiveStage(stage);
    setShowStageEditor(true);
  };

  const handleStageDelete = (stageId: string) => {
    if (!template) return;

    const updatedStages = template.configuration.stages.filter(stage => stage.id !== stageId);
    
    setTemplate({
      ...template,
      configuration: {
        ...template.configuration,
        stages: updatedStages,
      },
    });

    // Close editor if deleting current stage
    if (activeStage?.id === stageId) {
      setActiveStage(null);
      setShowStageEditor(false);
    }
  };

  const handleTemplateUpdate = (updates: Partial<WorkflowTemplate>) => {
    if (!template) return;

    setTemplate({
      ...template,
      ...updates,
    });
  };

  const validateTemplate = (template: WorkflowTemplate): string[] => {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push('Template name is required');
    }

    if (template.configuration.stages.length === 0) {
      errors.push('At least one stage is required');
    }

    // Check for duplicate stage IDs
    const stageIds = template.configuration.stages.map(s => s.id);
    const duplicateIds = stageIds.filter((id, index) => stageIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate stage IDs found: ${duplicateIds.join(', ')}`);
    }

    return errors;
  };

  const getStageCount = () => template?.configuration.stages.length || 0;
  const getAutomationCount = () => 
    template?.configuration.stages.reduce((count, stage) => count + stage.automations.length, 0) || 0;

  if (loading) {
    return (
      <MainLayout currentPage="Workflow Builder">
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!template) {
    return (
      <MainLayout currentPage="Workflow Builder">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Template Not Found</h2>
            <p className="text-slate-400 mb-4">The workflow template could not be loaded.</p>
            <Button onClick={() => navigate('/workflow-templates')}>
              Back to Templates
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="Workflow Builder">
      <div className="flex h-screen bg-slate-950">
        {/* Left Sidebar - Template Settings */}
        <div className={`transition-all duration-300 ${showSettings ? 'w-80' : 'w-16'} bg-slate-900 border-r border-slate-700 flex flex-col`}>
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              {showSettings && (
                <h3 className="text-sm font-medium text-white">Template Settings</h3>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showSettings && (
            <div className="flex-1 overflow-y-auto p-4">
              <TemplateSettings template={template} onUpdate={handleTemplateUpdate} />
            </div>
          )}

          {!showSettings && (
            <div className="flex-1 flex flex-col items-center pt-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/workflow-templates')}
                title="Back to Templates"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Main Canvas - Workflow Stages */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{template.name}</h1>
                <div className="flex items-center space-x-4 mt-2 text-sm text-slate-400">
                  <span>{getStageCount()} stages</span>
                  <span>•</span>
                  <span>{getAutomationCount()} automations</span>
                  <span>•</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {errors.length > 0 && (
                  <div className="flex items-center text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.length} error{errors.length !== 1 ? 's' : ''}
                  </div>
                )}

                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Template
                </Button>

                {template.isActive && (
                  <Button variant="secondary">
                    <Play className="w-4 h-4 mr-2" />
                    Test Workflow
                  </Button>
                )}
              </div>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <h4 className="text-sm font-medium text-red-400 mb-2">Please fix the following errors:</h4>
                <ul className="text-sm text-red-300 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 p-6">
            <WorkflowCanvas
              template={template}
              onStageClick={handleStageClick}
              onStageUpdate={handleStageUpdate}
              onStageAdd={handleStageAdd}
              onStageDelete={handleStageDelete}
              readonly={previewMode}
            />
          </div>
        </div>

        {/* Right Sidebar - Stage Configuration or Library */}
        <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col">
          {showStageEditor && activeStage ? (
            <StageEditor
              stage={activeStage}
              onUpdate={handleStageUpdate}
              onClose={() => {
                setShowStageEditor(false);
                setActiveStage(null);
              }}
            />
          ) : (
            <StageLibrary onAddStage={handleStageAdd} />
          )}
        </div>
      </div>
    </MainLayout>
  );
};
