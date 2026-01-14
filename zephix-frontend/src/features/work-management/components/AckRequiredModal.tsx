import { AckRequiredResponse } from '../types/ack.types';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

interface AckRequiredModalProps {
  open: boolean;
  response: AckRequiredResponse | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AckRequiredModal({
  open,
  response,
  onConfirm,
  onCancel,
}: AckRequiredModalProps) {
  if (!open || !response) return null;

  const displayedEntities = response.ack.impactedEntities.slice(0, 5);
  const hasMore = response.ack.impactedEntities.length > 5;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{PHASE5_1_COPY.CONFIRMATION_REQUIRED}</h3>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4">
            <p className="text-sm text-gray-700 mb-4">{response.ack.impactSummary}</p>

            {response.ack.impactedEntities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Impacted items:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {displayedEntities.map((entity, idx) => (
                    <li key={idx}>
                      {entity.name || entity.id} ({entity.type})
                    </li>
                  ))}
                  {hasMore && (
                    <li className="text-gray-500">and {response.ack.impactedEntities.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Confirm change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

