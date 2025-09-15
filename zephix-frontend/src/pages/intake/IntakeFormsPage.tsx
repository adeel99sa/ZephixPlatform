import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface IntakeForm {
  id: string;
  title: string;
  description: string;
  category: 'project' | 'support' | 'feature' | 'bug' | 'general';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  submitterName: string;
  submitterEmail: string;
  submitterDepartment: string;
  estimatedEffort: number; // in hours
  requestedCompletionDate: Date;
  submittedAt: Date;
  updatedAt: Date;
  organizationId: string;
  assignedTo?: string;
  tags: string[];
  attachments: string[];
}

export const IntakeFormsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<IntakeForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Load forms on component mount
  useEffect(() => {
    loadForms();
  }, []);

  // Filter forms when filters change
  useEffect(() => {
    filterForms();
  }, [forms, searchTerm, selectedCategory, selectedStatus, selectedPriority]);

  const loadForms = async () => {
    if (!user?.organizationId) {
      setError('Organization context required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Use existing API pattern with proper organization scoping
      const response = await api.get('/intake/forms', {
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      setForms(response.data || []);
    } catch (error) {
      console.error('Failed to load intake forms:', error);
      setError('Failed to load intake forms');
      // Fallback to empty array instead of mock data
      setForms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterForms = () => {
    let filtered = forms;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(form =>
        form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.submitterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(form => form.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(form => form.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(form => form.priority === selectedPriority);
    }

    setFilteredForms(filtered);
  };

  const handleStatusChange = async (formId: string, newStatus: string) => {
    if (!user?.organizationId) {
      toast.error('Organization context required');
      return;
    }

    try {
      // Use existing API pattern with proper authentication and organization scoping
      const response = await api.get(`/intake/forms/${formId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      // Update local state
      setForms(prev => 
        prev.map(form => 
          form.id === formId 
            ? { ...form, status: newStatus as IntakeForm['status'] }
            : form
        )
      );
      
      toast.success('Form status updated');
    } catch (error) {
      console.error('Failed to update form status:', error);
      toast.error('Failed to update form status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'project':
        return 'bg-blue-100 text-blue-800';
      case 'support':
        return 'bg-green-100 text-green-800';
      case 'feature':
        return 'bg-purple-100 text-purple-800';
      case 'bug':
        return 'bg-red-100 text-red-800';
      case 'general':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <ClockIcon className="w-4 h-4" />;
      case 'under_review':
        return <EyeIcon className="w-4 h-4" />;
      case 'approved':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4" />;
      case 'closed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'draft':
        return <PencilIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatEffort = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading intake forms...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Intake Forms"
          subtitle="Manage and track project intake requests"
        >
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Form
          </button>
        </PageHeader>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadForms}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Intake Forms"
        subtitle="Manage and track project intake requests"
      >
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Form
        </button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search intake forms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                <option value="project">Project</option>
                <option value="support">Support</option>
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="sm:w-48">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Forms List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Intake Forms ({filteredForms.length})
              </h3>
              <button
                onClick={loadForms}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          {filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No intake forms found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {forms.length === 0 
                  ? 'No intake forms available yet. Create your first form to get started.'
                  : 'Try adjusting your filters to see more forms.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredForms.map((form) => (
                <div key={form.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {form.title}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(form.category)}`}>
                          {form.category.charAt(0).toUpperCase() + form.category.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}>
                          {getStatusIcon(form.status)}
                          <span className="ml-1 capitalize">{form.status.replace('_', ' ')}</span>
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(form.priority)}`}>
                          {form.priority.charAt(0).toUpperCase() + form.priority.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{form.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
                        <div>
                          <span className="font-medium text-gray-900">Submitter:</span>
                          <p>{form.submitterName}</p>
                          <p className="text-xs">{form.submitterEmail}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Department:</span>
                          <p>{form.submitterDepartment}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Effort:</span>
                          <p>{formatEffort(form.estimatedEffort)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Requested:</span>
                          <p>{formatDate(form.requestedCompletionDate)}</p>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {form.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Attachments */}
                      {form.attachments.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>{form.attachments.length} attachment(s)</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-3">
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
