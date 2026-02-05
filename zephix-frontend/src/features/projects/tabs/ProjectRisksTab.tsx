/**
 * ProjectRisksTab
 *
 * Risks tab content - displays project risks and mitigations.
 * Create functionality is behind feature flag (risksEnabled).
 */

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Plus, RefreshCw, Calendar, User, X } from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspaceStore } from '@/state/workspace.store';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { isRisksEnabled } from '@/lib/flags';
import { useRisks, type Risk, type RiskSeverity, type RiskStatus, SEVERITY_CONFIG, STATUS_CONFIG, type CreateRiskInput } from '@/features/risks';

// --- Create Risk Modal (Feature Flagged) ---

interface CreateRiskModalProps {
  projectId: string;
  onClose: () => void;
  onSubmit: (input: CreateRiskInput) => Promise<void>;
}

const CreateRiskModal: React.FC<CreateRiskModalProps> = ({ projectId, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<RiskSeverity>('MEDIUM');
  const [status, setStatus] = useState<RiskStatus>('OPEN');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        status,
        dueDate: dueDate || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Risk</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Risk title"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Risk description"
              rows={3}
            />
          </div>

          {/* Severity & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as RiskSeverity)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RiskStatus)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="OPEN">Open</option>
                <option value="MITIGATED">Mitigated</option>
                <option value="ACCEPTED">Accepted</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              disabled={submitting || !title.trim()}
            >
              {submitting ? 'Creating...' : 'Create Risk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Risk Row Component ---

interface RiskRowProps {
  risk: Risk;
}

const RiskRow: React.FC<RiskRowProps> = ({ risk }) => {
  const severityConfig = SEVERITY_CONFIG[risk.severity];
  const statusConfig = STATUS_CONFIG[risk.status];

  const isOptimistic = risk.id.startsWith('temp-');

  return (
    <div
      className={`p-4 border-b last:border-b-0 ${isOptimistic ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{risk.title}</h4>
          {risk.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{risk.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {risk.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(risk.dueDate).toLocaleDateString()}
              </span>
            )}
            {risk.ownerUserId && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Assigned
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityConfig.color} ${severityConfig.bgColor}`}>
            {severityConfig.label}
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusConfig.color} ${statusConfig.bgColor}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export const ProjectRisksTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { canWrite } = useWorkspaceRole(activeWorkspaceId);

  const risksEnabled = isRisksEnabled();

  const { risks, loading, error, refetch, createRiskOptimistic } = useRisks({
    projectId,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateRisk = useCallback(
    async (input: CreateRiskInput) => {
      await createRiskOptimistic(input);
    },
    [createRiskOptimistic]
  );

  // Loading state
  if (loading && risks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Error state
  if (error && risks.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <EmptyState
          title="Failed to load risks"
          description={error}
          icon={<AlertTriangle className="h-12 w-12 text-red-400" />}
          action={
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          }
        />
      </div>
    );
  }

  // Empty state
  if (risks.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <EmptyState
          title="No risks identified"
          description="Track project risks and their mitigations here. Risks will be automatically identified based on project health."
          icon={<AlertTriangle className="h-12 w-12" />}
          action={
            risksEnabled && canWrite ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Risk
              </button>
            ) : undefined
          }
        />

        {showCreateModal && projectId && (
          <CreateRiskModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateRisk}
          />
        )}
      </div>
    );
  }

  // Risk list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Project Risks ({risks.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {risksEnabled && canWrite && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Risk
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {risks.map((risk) => (
          <RiskRow key={risk.id} risk={risk} />
        ))}
      </div>

      {showCreateModal && projectId && (
        <CreateRiskModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRisk}
        />
      )}
    </div>
  );
};

export default ProjectRisksTab;
