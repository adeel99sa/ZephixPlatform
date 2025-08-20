import React from 'react';
import { CheckSquare, AlertTriangle, Shield } from 'lucide-react';
import { Card } from '../shared/Card';
import type { GovernanceMetrics } from '../../../types/admin';

interface GovernanceCardProps {
  data: GovernanceMetrics;
}

export const GovernanceCard: React.FC<GovernanceCardProps> = ({ data }) => {
  const complianceColor = data.complianceScore >= 80 ? 'text-success' : 
                         data.complianceScore >= 60 ? 'text-warning' : 'text-error';
  
  const complianceIcon = data.complianceScore >= 80 ? CheckSquare : 
                        data.complianceScore >= 60 ? AlertTriangle : Shield;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Governance</h3>
        <Shield className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${complianceColor} mb-1`}>
            {data.complianceScore}%
          </div>
          <div className="text-sm text-gray-500">Compliance Score</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{data.projectsWithApprovalGates}</div>
            <div className="text-gray-500">Approval Gates</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{data.totalProjects}</div>
            <div className="text-gray-500">Total Projects</div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {data.pendingApprovals} pending approvals
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button className="text-sm text-primary hover:text-blue-700 font-medium">
          Review approvals →
        </button>
      </div>
    </Card>
  );
};

