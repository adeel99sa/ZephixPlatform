import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CalendarIcon,
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

interface CollaborationItem {
  id: string;
  title: string;
  description: string;
  type: 'discussion' | 'document' | 'meeting' | 'task' | 'announcement';
  status: 'active' | 'resolved' | 'archived' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  participants: string[];
  tags: string[];
  lastActivity: Date;
  isPublic: boolean;
}

export const CollaborationPage: React.FC = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<CollaborationItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CollaborationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Load collaboration items on component mount
  useEffect(() => {
    loadCollaborationItems();
  }, []);

  // Filter items when filters change
  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedType, selectedStatus, selectedPriority]);

  const loadCollaborationItems = async () => {
    if (!user?.organizationId) {
      setError('Organization context required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Use existing API pattern with proper organization scoping
      const response = await api.get('/collaboration', {
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      setItems(response.data || []);
    } catch (error) {
      console.error('Failed to load collaboration items:', error);
      setError('Failed to load collaboration items');
      // Fallback to empty array instead of mock data
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(item => item.priority === selectedPriority);
    }

    setFilteredItems(filtered);
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    if (!user?.organizationId) {
      toast.error('Organization context required');
      return;
    }

    try {
      // Use existing API pattern with proper authentication and organization scoping
      const response = await api.get(`/collaboration/${itemId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      // Update local state
      setItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, status: newStatus as CollaborationItem['status'] }
            : item
        )
      );
      
      toast.success('Item status updated');
    } catch (error) {
      console.error('Failed to update item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'discussion':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'task':
        return 'bg-indigo-100 text-indigo-800';
      case 'announcement':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
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
      case 'active':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'archived':
        return <XCircleIcon className="w-4 h-4" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'discussion':
        return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
      case 'document':
        return <DocumentTextIcon className="w-5 h-5" />;
      case 'meeting':
        return <CalendarIcon className="w-5 h-5" />;
      case 'task':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'announcement':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <UsersIcon className="w-5 h-5" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading collaboration items...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Team Collaboration"
          subtitle="Collaborate with your team on projects and tasks"
        >
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Item
          </button>
        </PageHeader>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadCollaborationItems}
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
        title="Team Collaboration"
        subtitle="Collaborate with your team on projects and tasks"
      >
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Item
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
                  placeholder="Search collaboration items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="sm:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="discussion">Discussion</option>
                <option value="document">Document</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="announcement">Announcement</option>
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
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
                <option value="pending">Pending</option>
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

        {/* Collaboration Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Collaboration Items ({filteredItems.length})
              </h3>
              <button
                onClick={loadCollaborationItems}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No collaboration items found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {items.length === 0 
                  ? 'No collaboration items available yet. Create your first item to get started.'
                  : 'Try adjusting your filters to see more items.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <div key={item.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(item.type)}
                          <h4 className="text-lg font-medium text-gray-900">
                            {item.title}
                          </h4>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status}</span>
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{item.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <UsersIcon className="w-4 h-4" />
                          <span>{item.participants.length} participants</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>Created: {formatDate(item.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Last activity: {formatTimeAgo(item.lastActivity)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>By: {item.createdBy}</span>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.map((tag, index) => (
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
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                          Join
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
