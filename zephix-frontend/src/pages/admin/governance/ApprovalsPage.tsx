import React, { useState } from 'react';
import { useGovernanceApprovals } from '../../../hooks/useAdminData';
import { useRoleEnforcement } from '../../../hooks/useRoleEnforcement';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { Card } from '../../../components/admin/shared/Card';
import { ApprovalList } from '../../../components/admin/governance/ApprovalList';
import { Button } from '../../../components/admin/shared/Button';
import { Permission } from '../../../utils/rolePolicy';

export const ApprovalsPage: React.FC = () => {
  const { approvals, loading, error, makeDecision } = useGovernanceApprovals();
  const { hasPermission } = useRoleEnforcement();
  const { isEnabled } = useFeatureFlags();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const canApprove = hasPermission(Permission.WRITE_GOVERNANCE);
  const approvalsEnabled = isEnabled('approvals');

  if (!approvalsEnabled) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Approvals Coming Soon</h2>
        <p className="text-gray-600">The approvals feature is currently being rolled out.</p>
      </div>
    );
  }

  if (loading) return <ApprovalsSkeleton />;
  if (error) return <ErrorState message={error} />;

  const filteredApprovals = approvals.filter(approval => 
    filter === 'all' || approval.status === filter
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-medium text-gray-900">Governance Approvals</h1>
        
        <div className="flex items-center space-x-4">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
          >
            <option value="all">All Approvals</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <Card>
        <ApprovalList 
          approvals={filteredApprovals}
          onDecision={makeDecision}
          canApprove={canApprove}
        />
      </Card>
    </div>
  );
};

const ApprovalsSkeleton: React.FC = () => (
  <div>
    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
    <Card>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4 py-4">
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12">
    <div className="text-red-600 mb-4">⚠️</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Approvals</h3>
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

