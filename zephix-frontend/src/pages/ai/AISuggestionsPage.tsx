import React, { useState, useEffect } from 'react';
import { 
  LightBulbIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../services/api.service';
import toast from 'react-hot-toast';

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  category: 'risk' | 'opportunity' | 'optimization' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  createdAt: Date;
  organizationId: string;
  userId: string;
  projectId?: string;
  tags: string[];
}

export const AISuggestionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Load suggestions on component mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  // Filter suggestions when filters change
  useEffect(() => {
    filterSuggestions();
  }, [suggestions, searchTerm, selectedCategory, selectedPriority, selectedStatus]);

  const loadSuggestions = async () => {
    if (!user?.organizationId) {
      setError('Organization context required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Use existing API pattern with proper organization scoping
      const response = await apiRequest('/ai/suggestions', {
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      setSuggestions(response || []);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
      setError('Failed to load AI suggestions');
      // Fallback to empty array instead of mock data
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSuggestions = () => {
    let filtered = suggestions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(suggestion =>
        suggestion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suggestion.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suggestion.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.category === selectedCategory);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.priority === selectedPriority);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.status === selectedStatus);
    }

    setFilteredSuggestions(filtered);
  };

  const handleStatusChange = async (suggestionId: string, newStatus: string) => {
    if (!user?.organizationId) {
      toast.error('Organization context required');
      return;
    }

    try {
      // Use existing API pattern with proper authentication and organization scoping
      const response = await apiRequest(`/ai/suggestions/${suggestionId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      // Update local state
      setSuggestions(prev => 
        prev.map(suggestion => 
          suggestion.id === suggestionId 
            ? { ...suggestion, status: newStatus as AISuggestion['status'] }
            : suggestion
        )
      );
      
      toast.success('Suggestion status updated');
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
      toast.error('Failed to update suggestion status');
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'risk':
        return 'bg-red-100 text-red-800';
      case 'opportunity':
        return 'bg-green-100 text-green-800';
      case 'optimization':
        return 'bg-blue-100 text-blue-800';
      case 'compliance':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented':
        return 'bg-green-100 text-green-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading AI suggestions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="AI Suggestions"
          subtitle="AI-powered insights and recommendations for your projects"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadSuggestions}
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
        title="AI Suggestions"
        subtitle="AI-powered insights and recommendations for your projects"
      />

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
                  placeholder="Search suggestions..."
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
                <option value="risk">Risk</option>
                <option value="opportunity">Opportunity</option>
                <option value="optimization">Optimization</option>
                <option value="compliance">Compliance</option>
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

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="implemented">Implemented</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                AI Suggestions ({filteredSuggestions.length})
              </h3>
              <button
                onClick={loadSuggestions}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {suggestions.length === 0 
                  ? 'No AI suggestions available yet. Check back later for insights.'
                  : 'Try adjusting your filters to see more suggestions.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {suggestion.title}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(suggestion.category)}`}>
                          {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{suggestion.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <ChartBarIcon className="w-4 h-4" />
                          <span>Confidence: {suggestion.confidence}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>Created: {suggestion.createdAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Impact: {suggestion.impact}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Effort: {suggestion.effort}</span>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {suggestion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {suggestion.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-3">
                      {/* Status */}
                      <select
                        value={suggestion.status}
                        onChange={(e) => handleStatusChange(suggestion.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border-0 ${getStatusColor(suggestion.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="implemented">Implemented</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <ChartBarIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <CheckCircleIcon className="w-4 h-4" />
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
