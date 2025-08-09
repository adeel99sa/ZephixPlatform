import React from 'react';
import { WorkflowTemplate, WORKFLOW_TEMPLATE_TYPES } from '../../types/workflow';
import { Button } from '../ui/Button';
import { 
  Settings, 
  Save, 
  Tag, 
  Globe, 
  Eye, 
  EyeOff,
  Star,
  StarOff 
} from 'lucide-react';

interface TemplateSettingsProps {
  template: WorkflowTemplate;
  onUpdate: (updates: Partial<WorkflowTemplate>) => void;
}

export const TemplateSettings: React.FC<TemplateSettingsProps> = ({
  template,
  onUpdate
}) => {
  const handleUpdate = (field: keyof WorkflowTemplate, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleMetadataUpdate = (field: string, value: any) => {
    onUpdate({
      metadata: {
        ...template.metadata,
        [field]: value
      }
    });
  };

  const handleConfigUpdate = (field: string, value: any) => {
    onUpdate({
      configuration: {
        ...template.configuration,
        settings: {
          ...template.configuration.settings,
          [field]: value
        }
      }
    });
  };

  const handleTagsUpdate = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
    handleMetadataUpdate('tags', tags);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          Basic Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter template name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={template.description || ''}
              onChange={(e) => handleUpdate('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what this workflow template does"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Template Type
            </label>
            <select
              value={template.type}
              onChange={(e) => handleUpdate('type', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(WORKFLOW_TEMPLATE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Category
            </label>
            <input
              type="text"
              value={template.metadata.category || ''}
              onChange={(e) => handleMetadataUpdate('category', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., IT, Marketing, Operations"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center">
              <Tag className="w-3 h-3 mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={template.metadata.tags?.join(', ') || ''}
              onChange={(e) => handleTagsUpdate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
      </div>

      {/* Status & Visibility */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Status & Visibility</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={template.isActive}
                onChange={(e) => handleUpdate('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-slate-300">
                Active Template
              </label>
            </div>
            <div className={`w-2 h-2 rounded-full ${template.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={template.isDefault}
                onChange={(e) => handleUpdate('isDefault', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm text-slate-300 flex items-center">
                <Star className={`w-3 h-3 mr-1 ${template.isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                Default Template
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={template.isPublic}
                onChange={(e) => handleUpdate('isPublic', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-slate-300 flex items-center">
                {template.isPublic ? (
                  <Eye className="w-3 h-3 mr-1 text-blue-400" />
                ) : (
                  <EyeOff className="w-3 h-3 mr-1 text-slate-400" />
                )}
                Public Template
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-xs text-slate-400 space-y-1">
            <p><strong>Active:</strong> Can be used to create new workflow instances</p>
            <p><strong>Default:</strong> Automatically selected for this workflow type</p>
            <p><strong>Public:</strong> Visible to other organizations (enterprise feature)</p>
          </div>
        </div>
      </div>

      {/* Workflow Settings */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Workflow Settings</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoProgressOnApproval"
                checked={template.configuration.settings.autoProgressOnApproval}
                onChange={(e) => handleConfigUpdate('autoProgressOnApproval', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoProgressOnApproval" className="text-sm text-slate-300">
                Auto-progress on approval
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requireAllApprovals"
                checked={template.configuration.settings.requireAllApprovals}
                onChange={(e) => handleConfigUpdate('requireAllApprovals', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="requireAllApprovals" className="text-sm text-slate-300">
                Require all approvals
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyOnStageChange"
                checked={template.configuration.settings.notifyOnStageChange}
                onChange={(e) => handleConfigUpdate('notifyOnStageChange', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="notifyOnStageChange" className="text-sm text-slate-300">
                Notify on stage changes
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowParallelExecution"
                checked={template.configuration.settings.allowParallelExecution}
                onChange={(e) => handleConfigUpdate('allowParallelExecution', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="allowParallelExecution" className="text-sm text-slate-300">
                Allow parallel execution
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Version Information */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Version Information</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Version:</span>
            <span className="text-white font-mono">{template.metadata.version}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Created:</span>
            <span className="text-white">{new Date(template.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Modified:</span>
            <span className="text-white">{new Date(template.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Save className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};
