import { PreviewResponse } from '../api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';

interface TemplatePreviewModalProps {
  open: boolean;
  loading: boolean;
  error: { code: string; message: string } | null;
  data: PreviewResponse | null;
  onClose: () => void;
  onUseTemplate: () => void;
}

export function TemplatePreviewModal({
  open,
  loading,
  error,
  data,
  onClose,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  const { isReadOnly } = useWorkspaceStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {data?.templateName || 'Template Preview'}
            </h3>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4">
            {loading && (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading preview...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error.message}</p>
              </div>
            )}

            {!loading && !error && data && (
              <div className="space-y-6">
                {/* Lock sentence - use exact locked phrase */}
                <p className="text-sm text-gray-700">
                  {PHASE5_1_COPY.STRUCTURE_LOCKS}
                </p>

                {/* Phase list table */}
                <div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phase
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasks
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Milestone
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.phases.map((phase, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {phase.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {phase.taskCount}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {phase.isMilestone && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Milestone
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Allowed before start */}
                {data.allowedBeforeStart.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Allowed before start</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {data.allowedBeforeStart.slice(0, 5).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Allowed after start */}
                {data.allowedAfterStart.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Allowed after start</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {data.allowedAfterStart.slice(0, 5).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
            {!isReadOnly && (
              <button
                onClick={onUseTemplate}
                disabled={loading || !data}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

