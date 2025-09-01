import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface ProjectMetrics {
  projectId: string;
  projectName: string;
  onTimeDelivery: number;
  budgetVariance: number;
  resourceUtilization: number;
  riskScore: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface ResourceMetrics {
  userId: string;
  userName: string;
  utilizationPercentage: number;
  projectCount: number;
  conflictCount: number;
  efficiencyScore: number;
}

interface RiskMetrics {
  riskType: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalUsers: number;
  conflictsPrevented: number;
  averageProjectSuccess: number;
}

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await api.get('/projects/organization/statistics');
      setStats(statsResponse);

      // Mock data for demonstration (replace with real API calls when available)
      setProjectMetrics([
        {
          projectId: '1',
          projectName: 'Website Redesign',
          onTimeDelivery: 85,
          budgetVariance: -5,
          resourceUtilization: 78,
          riskScore: 25,
          tasksCompleted: 45,
          tasksTotal: 60
        },
        {
          projectId: '2',
          projectName: 'Mobile App Development',
          onTimeDelivery: 92,
          budgetVariance: 8,
          resourceUtilization: 89,
          riskScore: 15,
          tasksCompleted: 32,
          tasksTotal: 40
        }
      ]);

      setResourceMetrics([
        {
          userId: '1',
          userName: 'John Doe',
          utilizationPercentage: 85,
          projectCount: 3,
          conflictCount: 0,
          efficiencyScore: 92
        },
        {
          userId: '2',
          userName: 'Jane Smith',
          utilizationPercentage: 78,
          projectCount: 2,
          conflictCount: 1,
          efficiencyScore: 87
        }
      ]);

      setRiskMetrics([
        { riskType: 'Resource Overallocation', count: 3, severity: 'high', trend: 'decreasing' },
        { riskType: 'Schedule Variance', count: 7, severity: 'medium', trend: 'stable' },
        { riskType: 'Budget Variance', count: 2, severity: 'low', trend: 'increasing' }
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Analytics data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (value: number, type: 'performance' | 'risk') => {
    if (type === 'performance') {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value <= 20) return 'text-green-600';
      if (value <= 50) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7m0 10H7" />
        </svg>;
      case 'decreasing':
        return <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10m0-10h10" />
        </svg>;
      default:
        return <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track performance, resource utilization, and risk patterns
          </p>
        </div>
        <div className="flex space-x-2">
          {['week', 'month', 'quarter'].map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conflicts Prevented</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.conflictsPrevented || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Project Performance</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    On-Time Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Variance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projectMetrics.map((project) => (
                  <tr key={project.projectId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(project.tasksCompleted / project.tasksTotal) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">
                          {project.tasksCompleted}/{project.tasksTotal}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={getStatusColor(project.onTimeDelivery, 'performance')}>
                        {project.onTimeDelivery}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={project.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {project.budgetVariance > 0 ? '+' : ''}{project.budgetVariance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={getStatusColor(project.resourceUtilization, 'performance')}>
                        {project.resourceUtilization}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={getStatusColor(project.riskScore, 'risk')}>
                        {project.riskScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resource Analytics & Risk Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Utilization */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Resource Utilization</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {resourceMetrics.map((resource) => (
                <div key={resource.userId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{resource.userName}</p>
                    <p className="text-sm text-gray-500">
                      {resource.projectCount} projects • {resource.conflictCount} conflicts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getStatusColor(resource.utilizationPercentage, 'performance')}`}>
                      {resource.utilizationPercentage}%
                    </p>
                    <p className="text-sm text-gray-500">
                      Efficiency: {resource.efficiencyScore}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Risk Analysis</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {riskMetrics.map((risk, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(risk.severity)}`}>
                      {risk.severity}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{risk.riskType}</p>
                      <p className="text-sm text-gray-500">{risk.count} instances</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(risk.trend)}
                    <span className="text-sm text-gray-500 capitalize">{risk.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};