import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuthStore } from '../../stores/authStore';
import { apiJson } from '../../services/api';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  department: string;
  position: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  lastActive: Date;
  avatar?: string;
  phone?: string;
  location?: string;
  organizationId: string;
  permissions: string[];
}

export const TeamPage: React.FC = () => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load team members on component mount
  useEffect(() => {
    loadTeamMembers();
  }, []);

  // Filter members when filters change
  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, selectedRole, selectedDepartment, selectedStatus]);

  const loadTeamMembers = async () => {
    if (!user?.organizationId) {
      setError('Organization context required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Use existing API pattern with proper organization scoping
      const response = await apiJson('/organizations/team', {
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      setMembers(response.data || []);
    } catch (error) {
      console.error('Failed to load team members:', error);
      setError('Failed to load team members');
      // Fallback to empty array instead of mock data
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(member => member.role === selectedRole);
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(member => member.department === selectedDepartment);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(member => member.status === selectedStatus);
    }

    setFilteredMembers(filtered);
  };

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    if (!user?.organizationId) {
      toast.error('Organization context required');
      return;
    }

    try {
      // Use existing API pattern with proper authentication and organization scoping
      const response = await apiJson(`/organizations/team/${memberId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
        headers: {
          'X-Org-Id': user.organizationId
        }
      });
      
      // Update local state
      setMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, status: newStatus as TeamMember['status'] }
            : member
        )
      );
      
      toast.success('Member status updated');
    } catch (error) {
      console.error('Failed to update member status:', error);
      toast.error('Failed to update member status');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'inactive':
        return <XCircleIcon className="w-4 h-4" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getDepartments = () => {
    const departments = members.map(member => member.department);
    return ['all', ...Array.from(new Set(departments))];
  };

  const getRoles = () => {
    const roles = members.map(member => member.role);
    return ['all', ...Array.from(new Set(roles))];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Team Management"
          subtitle="Manage your team members and their roles"
        >
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <PlusIcon className="w-4 h-4 mr-2" />
            Invite Member
          </button>
        </PageHeader>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadTeamMembers}
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
        title="Team Management"
        subtitle="Manage your team members and their roles"
      >
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <PlusIcon className="w-4 h-4 mr-2" />
          Invite Member
        </button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and View Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="sm:w-48">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {getRoles().map(role => (
                    <option key={role} value={role}>
                      {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="sm:w-48">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {getDepartments().map(dept => (
                    <option key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </option>
                  ))}
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
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${
                  viewMode === 'grid'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${
                  viewMode === 'list'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Team Members ({filteredMembers.length})
              </h3>
              <button
                onClick={loadTeamMembers}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {members.length === 0 
                  ? 'No team members available yet. Invite your first team member to get started.'
                  : 'Try adjusting your filters to see more members.'
                }
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-indigo-600">
                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </h4>
                          <p className="text-sm text-gray-500">{member.position}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          <span className="ml-1 capitalize">{member.status}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <EnvelopeIcon className="w-4 h-4" />
                        <span>{member.email}</span>
                      </div>
                      
                      {member.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <PhoneIcon className="w-4 h-4" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{member.department}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Joined</span>
                        <span>{formatDate(member.joinedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <div key={member.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </h4>
                        <p className="text-sm text-gray-500">{member.position} • {member.department}</p>
                        <p className="text-sm text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          <span className="ml-1 capitalize">{member.status}</span>
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Joined {formatDate(member.joinedAt)}
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
