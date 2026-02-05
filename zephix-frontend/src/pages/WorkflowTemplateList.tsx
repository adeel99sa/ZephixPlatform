import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { workflowTemplateService } from '../services/workflowService';
import { WorkflowTemplate, WORKFLOW_TEMPLATE_TYPES, WORKFLOW_STATUS_COLORS } from '../types/workflow';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Copy,
  Play,
  Pause,
  Trash2,
  Star,
  StarOff,
  Users,
  Clock,
  Zap,
  AlertCircle,
  Eye
} from 'lucide-react';

export const WorkflowTemplateList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});

  useEffect(() => {
    loadTemplates();
  }, [searchTerm, selectedType, selectedStatus, page]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 12 };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedStatus !== 'all') params.isActive = selectedStatus === 'active';

      const response = await workflowTemplateService.getAll(params);
      setTemplates(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    navigate('/workflow-templates/builder');
  };

  const handleEditTemplate = (template: WorkflowTemplate) => {
    navigate(`/workflow-templates/${template.id}/edit`);
  };

  const handleCloneTemplate = async (template: WorkflowTemplate) => {
    try {
      const clonedTemplate = await workflowTemplateService.clone(template.id, {
        name: `${template.name} (Copy)`,
        description: `Cloned from ${template.name}`,
      });
      navigate(`/workflow-templates/${clonedTemplate.id}/edit`);
    } catch (error) {
      console.error('Failed to clone template:', error);
    }
  };

  const handleToggleActive = async (template: WorkflowTemplate) => {
    try {
      if (template.isActive) {
        await workflowTemplateService.deactivate(template.id);
      } else {
        await workflowTemplateService.activate(template.id);
      }
      loadTemplates();
    } catch (error) {
      console.error('Failed to toggle template status:', error);
    }
  };

  const handleDeleteTemplate = async (template: WorkflowTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await workflowTemplateService.delete(template.id);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const getStageCount = (template: WorkflowTemplate) => template.configuration.stages.length;
  const getAutomationCount = (template: WorkflowTemplate) => 
    template.configuration.stages.reduce((count, stage) => count + stage.automations.length, 0);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || template.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && template.isActive) ||
      (selectedStatus === 'inactive' && !template.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <MainLayout currentPage="Workflow Templates">
      <div className="min-h-screen bg-slate-950">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Workflow Templates</h1>
              <p className="text-slate-400 mt-2">
                Create and manage configurable workflow templates for your organization
              </p>
            </div>
            <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {Object.entries(WORKFLOW_TEMPLATE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Templates Found</h3>
              <p className="text-slate-400 mb-6">
                {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by creating your first workflow template'}
              </p>
              <Button onClick={handleCreateTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEditTemplate(template)}
                  onClone={() => handleCloneTemplate(template)}
                  onToggleActive={() => handleToggleActive(template)}
                  onDelete={() => handleDeleteTemplate(template)}
                  stageCount={getStageCount(template)}
                  automationCount={getAutomationCount(template)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center mt-8 space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-slate-400 mx-4">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

interface TemplateCardProps {
  template: WorkflowTemplate;
  onEdit: () => void;
  onClone: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  stageCount: number;
  automationCount: number;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onClone,
  onToggleActive,
  onDelete,
  stageCount,
  automationCount
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-white truncate">{template.name}</h3>
            {template.isDefault && (
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              template.isActive ? WORKFLOW_STATUS_COLORS.active : 'bg-gray-100 text-gray-800'
            }`}>
              {template.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
              {WORKFLOW_TEMPLATE_TYPES[template.type]}
            </span>
          </div>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {showMenu && (
            <div className="absolute right-0 top-8 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10">
              <div className="py-1">
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Template
                </button>
                <button
                  onClick={() => { onClone(); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Template
                </button>
                <button
                  onClick={() => { onToggleActive(); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  {template.isActive ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Activate
                    </>
                  )}
                </button>
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-800"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Template
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-white">{stageCount}</div>
          <div className="text-xs text-slate-400">Stages</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-400">{automationCount}</div>
          <div className="text-xs text-slate-400">Automations</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-400">{template.instanceCount || 0}</div>
          <div className="text-xs text-slate-400">Instances</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          Updated {new Date(template.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex items-center space-x-2">
          {template.metadata.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-300"
            >
              {tag}
            </span>
          ))}
          {template.metadata.tags && template.metadata.tags.length > 2 && (
            <span className="text-xs text-slate-400">
              +{template.metadata.tags.length - 2} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
