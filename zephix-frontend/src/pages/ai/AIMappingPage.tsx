import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/layout/PageHeader';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

interface AIMappingItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  documentType: string;
  sourceFile: string;
  mappedFields: string[];
  processingTime?: number;
}

export const AIMappingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Use the new useApi hook with retry mechanisms
  const { 
    data: items, 
    loading, 
    error, 
    retry 
  } = useApi<AIMappingItem[]>('/ai/mapping', {
    retryCount: 3,
    retryDelay: 1000,
    autoRetry: true,
    onSuccess: (data) => {
      console.log('AI Mapping data loaded successfully:', data);
    },
    onError: (error) => {
      console.error('Failed to load AI Mapping data:', error);
    }
  });

  const filteredItems = items?.filter(item => {
    const searchMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
    const typeMatch = selectedType === 'all' || item.documentType === selectedType;
    return searchMatch && statusMatch && typeMatch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'processing':
        return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading AI mapping data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="AI Document Mapping"
          subtitle="Automatically map and extract data from documents using AI"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={retry}
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
        title="AI Document Mapping"
        subtitle="Automatically map and extract data from documents using AI"
      >
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Mapping
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
                  placeholder="Search mappings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
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
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="sm:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="invoice">Invoice</option>
                <option value="contract">Contract</option>
                <option value="report">Report</option>
                <option value="form">Form</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Mapping Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                AI Mappings ({filteredItems.length})
              </h3>
              <button
                onClick={retry}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No AI mappings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {items?.length === 0 
                  ? 'No AI mappings available yet. Create your first mapping to get started.'
                  : 'Try adjusting your filters to see more mappings.'
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
                          <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                          <h4 className="text-lg font-medium text-gray-900">
                            {item.title}
                          </h4>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status}</span>
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.documentType}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{item.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <span>Confidence: {formatConfidence(item.confidence)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Created: {formatDate(item.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Updated: {formatDate(item.updatedAt)}</span>
                        </div>
                        {item.processingTime && (
                          <div className="flex items-center space-x-1">
                            <span>Processing: {item.processingTime}s</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Mapped Fields */}
                      {item.mappedFields.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Mapped Fields:</h5>
                          <div className="flex flex-wrap gap-2">
                            {item.mappedFields.map((field, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-3">
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          View
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
