import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Button } from '../../components/ui/button/Button';
import { DataTable, Column } from '../../components/ui/table/DataTable';
import { ErrorBanner } from '../../components/ui/feedback/ErrorBanner';
import { apiClient } from '../../lib/api/client';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'project' | 'workflow' | 'document' | 'form' | 'email' | 'custom';
  status: 'active' | 'inactive' | 'draft' | 'archived';
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  usageCount: number;
  lastUsed?: string;
  tags: string[];
  parameters: Record<string, any>;
  isPublic: boolean;
}

export const TemplatesPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch templates using React Query
  const {
    data: templatesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await apiClient.get<{ templates: Template[] }>('/api/templates');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    deleteTemplateMutation.mutate(id);
  };

  const handleCreateTemplate = () => {
    setShowCreateModal(true);
  };

  const templates = templatesData?.templates || [];

  // Define columns for the DataTable
  const columns: Column<Template>[] = [
    {
      id: 'name',
      header: 'Template Name',
      accessor: (template) => (
        <div>
          <div className="font-medium text-foreground">{template.name}</div>
          <div className="text-sm text-muted-foreground">{template.description}</div>
        </div>
      ),
      sortable: true,
      filterable: true,
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (template) => (
        <span className={`px-2 py-1 rounded text-sm ${
          template.category === 'project' ? 'bg-blue-100 text-blue-800' :
          template.category === 'workflow' ? 'bg-green-100 text-green-800' :
          template.category === 'document' ? 'bg-purple-100 text-purple-800' :
          template.category === 'form' ? 'bg-orange-100 text-orange-800' :
          template.category === 'email' ? 'bg-pink-100 text-pink-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {template.category}
        </span>
      ),
      sortable: true,
      filterable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (template) => (
        <span className={`px-2 py-1 rounded text-sm ${
          template.status === 'active' ? 'bg-green-100 text-green-800' :
          template.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
          template.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {template.status}
        </span>
      ),
      sortable: true,
      filterable: true,
    },
    {
      id: 'version',
      header: 'Version',
      accessor: (template) => template.version,
      sortable: true,
    },
    {
      id: 'usageCount',
      header: 'Usage',
      accessor: (template) => template.usageCount,
      sortable: true,
    },
    {
      id: 'updatedAt',
      header: 'Last Updated',
      accessor: (template) => new Date(template.updatedAt).toLocaleDateString(),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (template) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* TODO: View template */}}
            aria-label={`View template ${template.name}`}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* TODO: Edit template */}}
            aria-label={`Edit template ${template.name}`}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTemplate(template.id)}
            className="text-destructive hover:text-destructive"
            aria-label={`Delete template ${template.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Templates"
        description="Manage your project and workflow templates"
        actions={
          <Button onClick={handleCreateTemplate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        }
      />

      {error && (
        <ErrorBanner
          description={error.message || 'Failed to load templates'}
          onRetry={() => refetch()}
          retryLabel="Retry"
        />
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={templates}
          caption="Available templates with sorting and filtering capabilities"
          loading={isLoading}
          emptyState={
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">Create your first template to get started with project management.</p>
              <Button onClick={handleCreateTemplate}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          }
        />
      </div>

      {/* TODO: Add CreateTemplateModal when ready */}
    </div>
  );
};