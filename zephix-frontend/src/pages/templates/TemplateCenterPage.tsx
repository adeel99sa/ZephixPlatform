/**
 * Template Center - Template Management UI
 * MVP: Create, edit, publish, and instantiate templates
 */

import { useState } from 'react';
import { listTemplates, TemplateDto, TemplateScope } from '@/features/templates/templates.api';

export default function TemplateCenterPage() {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | TemplateScope>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Empty state
  const isEmpty = !loading && templates.length === 0 && !error;

  return (
    <div className="h-full flex">
      {/* Left Panel - Template List */}
      <div className="w-80 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-900">Templates</h1>
        </div>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          {/* Scope Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'ALL' | TemplateScope)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="SYSTEM">System</option>
              <option value="ORG">Org</option>
              <option value="WORKSPACE">Workspace</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* New Template Button */}
          <button
            onClick={() => {
              // TODO: Open create modal
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            New Template
          </button>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-gray-500">Loading templates...</div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isEmpty && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No templates found</p>
              <p className="text-xs text-gray-400 mt-1">
                Create your first template to get started
              </p>
            </div>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="divide-y">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {template.templateScope} • v{template.version}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Template Details */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedTemplate ? (
          <TemplateDetailsPanel template={selectedTemplate} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Select a template to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateDetailsPanelProps {
  template: TemplateDto;
}

function TemplateDetailsPanel({ template }: TemplateDetailsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              template.templateScope === 'SYSTEM'
                ? 'bg-purple-100 text-purple-800'
                : template.templateScope === 'ORG'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {template.templateScope}
          </span>
        </div>
        {template.description && (
          <p className="text-gray-600 mt-1">{template.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium text-gray-700">Version</div>
          <div className="text-sm text-gray-900">{template.version}</div>
        </div>
        {template.publishedAt && (
          <div>
            <div className="text-sm font-medium text-gray-700">Published</div>
            <div className="text-sm text-gray-900">
              {new Date(template.publishedAt).toLocaleDateString()}
            </div>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-700">Updated</div>
          <div className="text-sm text-gray-900">
            {new Date(template.updatedAt).toLocaleDateString()}
          </div>
        </div>
        {template.methodology && (
          <div>
            <div className="text-sm font-medium text-gray-700">Methodology</div>
            <div className="text-sm text-gray-900">{template.methodology}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            // TODO: Open edit modal
          }}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Edit
        </button>
        <button
          onClick={() => {
            // TODO: Publish template
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Publish
        </button>
        <button
          onClick={() => {
            // TODO: Instantiate template
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Instantiate
        </button>
      </div>

      {/* Placeholder for structure editor and KPIs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Structure</h3>
        <p className="text-sm text-gray-500">Structure editor will be added in next step</p>
      </div>
    </div>
  );
}
