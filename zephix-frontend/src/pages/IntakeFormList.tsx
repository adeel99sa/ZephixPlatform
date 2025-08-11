import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { intakeFormService } from '../services/workflowService';
import { IntakeForm } from '../types/workflow';
import {
  Plus,
  Search,
  MoreVertical,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  BarChart3,
  Share,
  Sparkles
} from 'lucide-react';

export const IntakeFormList: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const loadedForms = await intakeFormService.getForms();
      setForms(loadedForms);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = () => {
    navigate('/intake-forms/builder');
  };

  const handleAIDesigner = () => {
    navigate('/intake-forms/ai-designer');
  };

  const handleEditForm = (form: IntakeForm) => {
    navigate(`/intake-forms/${form.id}/edit`);
  };

  const handleDeleteForm = async (form: IntakeForm) => {
    if (!confirm(`Are you sure you want to delete "${form.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await intakeFormService.deleteForm(form.id);
      loadForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  const handleToggleActive = async (form: IntakeForm) => {
    try {
      await intakeFormService.updateForm(form.id, {
        isActive: !form.isActive
      });
      loadForms();
    } catch (error) {
      console.error('Failed to toggle form status:', error);
    }
  };

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout currentPage="Intake Forms">
      <div className="min-h-screen bg-slate-950">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Intake Forms</h1>
              <p className="text-slate-400 mt-2">
                Create and manage public intake forms for collecting requests
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={handleAIDesigner} 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Designer
              </Button>
              <Button onClick={handleCreateForm} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Form
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Forms Found</h3>
              <p className="text-slate-400 mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Get started by creating your first intake form'}
              </p>
              <Button onClick={handleCreateForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  onEdit={() => handleEditForm(form)}
                  onDelete={() => handleDeleteForm(form)}
                  onToggleActive={() => handleToggleActive(form)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

interface FormCardProps {
  form: IntakeForm;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

const FormCard: React.FC<FormCardProps> = ({
  form,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/intake/${form.slug}`;
    navigator.clipboard.writeText(url);
  };

  const handleViewLive = () => {
    window.open(`/intake/${form.slug}`, '_blank');
  };

  const getFieldCount = () => form.formSchema.fields.length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white truncate mb-2">{form.name}</h3>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
            {form.isPublic && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Public
              </span>
            )}
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
                  Edit Form
                </button>
                {form.isPublic && form.isActive && (
                  <button
                    onClick={() => { handleViewLive(); setShowMenu(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live
                  </button>
                )}
                <button
                  onClick={() => { handleCopyUrl(); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Copy URL
                </button>
                <button
                  onClick={() => { onToggleActive(); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  {form.isActive ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
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
                  Delete Form
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {form.description && (
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
          {form.description}
        </p>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-white">{getFieldCount()}</div>
          <div className="text-xs text-slate-400">Fields</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-400">{form.analytics.totalViews}</div>
          <div className="text-xs text-slate-400">Views</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-400">{form.analytics.totalSubmissions}</div>
          <div className="text-xs text-slate-400">Submissions</div>
        </div>
      </div>

      {/* URL Preview */}
      {form.isPublic && (
        <div className="mb-4 p-2 bg-slate-700 rounded text-xs text-slate-300 font-mono truncate">
          /intake/{form.slug}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          Updated {new Date(form.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex items-center space-x-2">
          {form.analytics.conversionRate > 0 && (
            <div className="flex items-center text-xs text-slate-400">
              <BarChart3 className="w-3 h-3 mr-1" />
              {form.analytics.conversionRate.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
