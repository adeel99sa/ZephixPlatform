import React, { useState } from 'react';
import { CheckSquare, Clock, AlertTriangle, Shield, TrendingUp, FileText } from 'lucide-react';
import { Card } from '../../components/admin/shared/Card';
import { Button } from '../../components/admin/shared/Button';
import { mockDashboardData } from '../../mocks/adminData';

export const Governance: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  
  // Mock data for governance
  const pendingApprovals = [
    {
      id: 'approval-1',
      projectName: 'E-commerce Platform Redesign',
      requester: 'Sarah Johnson',
      type: 'Feature Approval',
      submitted: '2024-08-19T10:30:00Z',
      priority: 'high'
    },
    {
      id: 'approval-2',
      projectName: 'Mobile App Security Update',
      requester: 'Michael Chen',
      type: 'Security Review',
      submitted: '2024-08-19T09:15:00Z',
      priority: 'critical'
    }
  ];

  const complianceMetrics = [
    { name: 'Projects with Approval Gates', value: 3, total: 15, status: 'good' },
    { name: 'Pending Approvals', value: 2, total: 2, status: 'warning' },
    { name: 'Compliance Score', value: 87, total: 100, status: 'good' },
    { name: 'Risk Level', value: 'Low', total: null, status: 'good' }
  ];

  const recentActivities = [
    {
      id: 'activity-1',
      action: 'Project approved',
      project: 'Customer Portal Enhancement',
      approver: 'John Smith',
      timestamp: '2024-08-19T11:00:00Z',
      status: 'approved'
    },
    {
      id: 'activity-2',
      action: 'Security review completed',
      project: 'API Gateway Update',
      approver: 'Lisa Thompson',
      timestamp: '2024-08-19T10:45:00Z',
      status: 'completed'
    },
    {
      id: 'activity-3',
      action: 'New approval gate added',
      project: 'Data Migration Project',
      approver: 'System',
      timestamp: '2024-08-19T10:30:00Z',
      status: 'created'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Governance & Compliance</h1>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceMetrics.map((metric) => (
          <Card key={metric.name}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                metric.status === 'good' ? 'text-green-600' : 
                metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metric.value}{metric.total ? `/${metric.total}` : ''}
              </div>
              <div className="text-sm text-gray-500 mt-1">{metric.name}</div>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(metric.status)}`}>
                {metric.status === 'good' ? '✓ Good' : 
                 metric.status === 'warning' ? '⚠ Warning' : '✗ Critical'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pending Approvals */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-warning" />
            <h2 className="text-xl font-medium text-gray-900">Pending Approvals</h2>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingApprovals.length}
            </span>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
        
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <div key={approval.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{approval.projectName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(approval.priority)}`}>
                      {approval.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{approval.type}</span> • Requested by {approval.requester}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Submitted {new Date(approval.submitted).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                  <Button size="sm">
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Approval Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <CheckSquare className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-medium text-gray-900">Approval Workflows</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="font-medium text-blue-900">Feature Development</div>
                <div className="text-sm text-blue-700">Requires PM + Tech Lead approval</div>
              </div>
              <div className="text-sm text-blue-600">Active</div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="font-medium text-green-900">Security Changes</div>
                <div className="text-sm text-green-700">Requires Security Team approval</div>
              </div>
              <div className="text-sm text-green-600">Active</div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Data Access</div>
                <div className="text-sm text-gray-700">Requires Data Owner approval</div>
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <Button variant="outline" size="sm" className="w-full">
              Configure Workflows
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-medium text-gray-900">Compliance Trends</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-sm font-medium text-green-600">+5%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Month</span>
              <span className="text-sm font-medium text-gray-900">82%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quarter Average</span>
              <span className="text-sm font-medium text-blue-600">85%</span>
            </div>
          </div>
          
          {/* Chart placeholder */}
          <div className="mt-4 h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-xs text-gray-500">📊 Compliance Trend Chart</span>
          </div>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-medium text-gray-900">Recent Activities</h2>
        </div>
        
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3 py-2">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'approved' ? 'bg-green-500' :
                activity.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
              }`} />
              <div className="flex-1">
                <span className="font-medium text-gray-900">{activity.action}</span>
                <span className="text-gray-600"> for </span>
                <span className="font-medium text-gray-900">{activity.project}</span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(activity.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <Button variant="outline" size="sm" className="w-full">
            View All Activities
          </Button>
        </div>
      </Card>
    </div>
  );
};

