import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/overlay/Modal';
import { Button } from '@/components/ui/button/Button';

export interface ResourceJustificationModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (justification: string) => void | Promise<void>;
  resourceName?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  projectedLoad?: number;
  threshold?: number;
  isLoading?: boolean;
  error?: string | null;
}

export const ResourceJustificationModal: React.FC<ResourceJustificationModalProps> = ({
  open,
  onCancel,
  onSubmit,
  resourceName,
  dateRange,
  projectedLoad,
  threshold,
  isLoading = false,
  error: externalError,
}) => {
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setJustification('');
      setError(null);
    }
  }, [open]);

  // Update error from external source
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  const handleSubmit = async () => {
    // Validate
    if (!justification.trim()) {
      setError('Justification is required');
      return;
    }

    setError(null);
    await onSubmit(justification.trim());
  };

  const handleCancel = () => {
    setJustification('');
    setError(null);
    onCancel();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleCancel}
      title="Justification Required"
      size="md"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="space-y-4">
        {/* Context information */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            This allocation exceeds the organization's justification threshold.
          </p>
          {resourceName && (
            <p>
              <span className="font-medium">Resource:</span> {resourceName}
            </p>
          )}
          {dateRange && (
            <p>
              <span className="font-medium">Period:</span>{' '}
              {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
            </p>
          )}
          {projectedLoad !== undefined && (
            <p>
              <span className="font-medium">Projected load:</span>{' '}
              <span className="font-semibold text-orange-600">
                {Math.round(projectedLoad)}%
              </span>
              {threshold !== undefined && (
                <span className="text-gray-500">
                  {' '}(threshold: {threshold}%)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-900">
            Please provide a reason or justification for this allocation. This
            helps ensure proper resource planning and governance.
          </p>
        </div>

        {/* Text area */}
        <div>
          <label
            htmlFor="justification-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Reason / Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            id="justification-input"
            value={justification}
            onChange={(e) => {
              setJustification(e.target.value);
              setError(null); // Clear error on input
            }}
            placeholder="e.g., Critical project deadline, temporary coverage, special initiative..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={isLoading}
            autoFocus
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isLoading || !justification.trim()}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};





