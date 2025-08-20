import React from 'react';
import { Table, TableColumn } from '../shared/Table';
import { Button } from '../shared/Button';
import { GovernanceApproval } from '../../../types/admin';

interface ApprovalListProps {
  approvals: GovernanceApproval[];
  onDecision: (approvalId: string, decision: 'approve' | 'reject', comment: string) => void;
  canApprove: boolean;
}

export const ApprovalList: React.FC<ApprovalListProps> = ({
  approvals,
  onDecision,
  canApprove
}) => {
  const [selectedApproval, setSelectedApproval] = React.useState<string | null>(null);
  const [decision, setDecision] = React.useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = React.useState('');

  const urgencyIcon = {
    low: '🟢',
    medium: '🟡', 
    high: '🔴',
    critical: '💥'
  };

  const handleDecision = async () => {
    if (selectedApproval && comment.trim()) {
      try {
        await onDecision(selectedApproval, decision, comment);
        setSelectedApproval(null);
        setComment('');
        setDecision('approve');
      } catch (error) {
        console.error('Failed to submit decision:', error);
      }
    }
  };

  const columns: TableColumn<GovernanceApproval>[] = [
    {
      key: 'gate',
      label: 'Gate',
      render: (approval) => (
        <div>
          <div className="font-medium text-gray-900">{approval.gate}</div>
          <div className="text-sm text-gray-500">Project: {approval.projectName}</div>
          <div className="text-xs text-gray-400">ID: {approval.projectId}</div>
        </div>
      )
    },
    {
      key: 'due',
      label: 'Due Date',
      render: (approval) => {
        const dueDate = new Date(approval.due);
        const isOverdue = dueDate < new Date();
        const isUrgent = approval.urgency === 'high' || approval.urgency === 'critical';
        
        return (
          <div className="space-y-1">
            <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {dueDate.toLocaleDateString()}
            </div>
            <div className="flex items-center space-x-1">
              <span aria-hidden="true">{urgencyIcon[approval.urgency]}</span>
              <span className={`text-xs capitalize ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                {approval.urgency}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (approval) => {
        const statusColors = {
          pending: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-green-100 text-green-800',
          rejected: 'bg-red-100 text-red-800',
          expired: 'bg-gray-100 text-gray-800'
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[approval.status]}`}>
            {approval.status}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (approval) => (
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSelectedApproval(approval.id)}
          >
            View
          </Button>
          {canApprove && approval.status === 'pending' && (
            <>
              <Button 
                size="sm" 
                variant="primary"
                onClick={() => {
                  setSelectedApproval(approval.id);
                  setDecision('approve');
                }}
              >
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedApproval(approval.id);
                  setDecision('reject');
                }}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <Table 
        data={approvals}
        columns={columns}
        emptyMessage="No approvals found"
      />

      {/* Decision Modal */}
      {selectedApproval && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decision-modal-title"
          aria-describedby="decision-modal-description"
        >
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <header className="mb-4">
                <h3 
                  id="decision-modal-title"
                  className="text-lg font-medium text-gray-900"
                >
                  {decision === 'approve' ? 'Approve' : 'Reject'} Approval
                </h3>
                <p 
                  id="decision-modal-description"
                  className="text-sm text-gray-600"
                >
                  Please provide a comment explaining your decision. This will be recorded in the audit trail.
                </p>
              </header>
              
              <div className="space-y-4">
                <div>
                  <label 
                    htmlFor="decision-comment"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Comment <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="decision-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter your reason for ${decision === 'approve' ? 'approving' : 'rejecting'} this approval...`}
                    aria-describedby="comment-help"
                    required
                  />
                  <p id="comment-help" className="text-xs text-gray-500 mt-1">
                    Minimum 10 characters required
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6" role="group" aria-label="Decision actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedApproval(null);
                    setComment('');
                  }}
                  aria-label="Cancel decision and close modal"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDecision}
                  variant={decision === 'approve' ? 'primary' : 'secondary'}
                  disabled={!comment.trim() || comment.length < 10}
                  aria-describedby={decision === 'approve' ? 'approve-help' : 'reject-help'}
                >
                  {decision === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>

              {/* Hidden descriptions for screen readers */}
              <div className="sr-only">
                <p id="approve-help">
                  Approve this approval request. Your comment will be recorded in the audit trail.
                </p>
                <p id="reject-help">
                  Reject this approval request. Your comment will be recorded in the audit trail.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
