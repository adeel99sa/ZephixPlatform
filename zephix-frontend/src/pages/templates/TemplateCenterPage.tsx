import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Users, Tag } from 'lucide-react';
import { projectTemplates, Template } from '@/data/projectTemplates';
import { CreateProjectFromTemplateModal } from '@/components/Modals/CreateProjectFromTemplateModal';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface TemplateCenterPageProps {
  templates?: Template[];
}

export function TemplateCenterPage({ templates = projectTemplates }: TemplateCenterPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'projects' | 'documents' | 'forms'>('projects');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = ['All', 'Agile', 'Waterfall', 'Marketing', 'Construction', 'IT'];
  
  const filteredTemplates = selectedCategory === 'All' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowCreateModal(true);
  };

  const handleStartFromScratch = () => {
    navigate('/create/project?template=blank');
  };

  // Get current workspace and organization from user context
  const currentWorkspaceId = currentWorkspace?.id || user?.currentWorkspaceId;
  const organizationId = user?.organizationId;

  if (!currentWorkspaceId || !organizationId) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center text-red-600">
          Error: No workspace selected. Please select a workspace first.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Template Center</h1>
              <p className="text-sm text-gray-600">Choose a template to get started quickly</p>
            </div>
            <button
              onClick={handleStartFromScratch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start from Scratch
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'projects', label: 'Projects' },
                { id: 'documents', label: 'Documents' },
                { id: 'forms', label: 'Forms' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Template Grid */}
        {!loading && !error && activeTab === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <div className="text-4xl text-blue-500">📋</div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {template.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {template.estimatedSetup}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {template.teamSize}
                    </div>
                  </div>

                  {/* Use Template Button */}
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Document Templates</h3>
            <p className="text-gray-600">Coming soon - Document templates will be available here.</p>
          </div>
        )}

        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Form Templates</h3>
            <p className="text-gray-600">Coming soon - Form templates will be available here.</p>
          </div>
        )}

        {/* Empty State */}
        {activeTab === 'projects' && filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600">Try selecting a different category or create a project from scratch.</p>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectFromTemplateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        workspaceId={currentWorkspaceId}
        organizationId={organizationId}
      />
    </div>
  );
}
