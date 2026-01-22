import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import {
  getRecommendations,
  getPreview,
  instantiateV51,
  TemplateCard,
  RecommendationResponse,
  PreviewResponse,
} from '@/features/templates/api';
import { TemplatePreviewModal } from '@/features/templates/components/TemplatePreviewModal';
import { ProjectNameModal } from '@/features/templates/components/ProjectNameModal';
import { assertNoSortUsage, getTemplateKey } from '@/features/templates/utils/order-preservation';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import { SuspendedAccessScreen } from '@/components/workspace/SuspendedAccessScreen';

type ContainerType = 'PROJECT' | 'PROGRAM';
type WorkType = 'MIGRATION' | 'IMPLEMENTATION' | 'SYSTEM_TRANSITION' | 'INTEGRATION';

interface PageState {
  containerType: ContainerType;
  workType: WorkType;
  loading: boolean;
  error: { code: string; message: string } | null;
  data: RecommendationResponse | null;
  preview: {
    open: boolean;
    loading: boolean;
    error: { code: string; message: string } | null;
    data: PreviewResponse | null;
    templateId: string | null;
  };
  instantiate: {
    loading: boolean;
    error: { code: string; message: string } | null;
  };
}

export function TemplateCenter() {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { isReadOnly, canWrite } = useWorkspaceRole(activeWorkspaceId);
  const [state, setState] = useState<PageState>({
    containerType: 'PROJECT',
    workType: 'MIGRATION',
    loading: false,
    error: null,
    data: null,
    preview: {
      open: false,
      loading: false,
      error: null,
      data: null,
      templateId: null,
    },
    instantiate: {
      loading: false,
      error: null,
    },
  });
  const [showProjectNameModal, setShowProjectNameModal] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  // Fetch recommendations on mount and when inputs change
  useEffect(() => {
    if (!activeWorkspaceId) {
      return;
    }

    fetchRecommendations();
  }, [activeWorkspaceId, state.containerType, state.workType]);

  const fetchRecommendations = async () => {
    if (!activeWorkspaceId) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getRecommendations(state.containerType, state.workType);

      // Order preservation guard - ensure no sorting
      if (data.recommended.length > 0) {
        assertNoSortUsage(data.recommended, 'recommended');
      }
      if (data.others.length > 0) {
        assertNoSortUsage(data.others, 'others');
      }

      setState((prev) => ({ ...prev, data, loading: false, error: null }));
    } catch (error: any) {
      const errorCode = error?.response?.data?.code || error?.code || 'UNKNOWN_ERROR';
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load recommendations';

      // Error mapping - use centralized helper
      const displayMessage = getApiErrorMessage({ code: errorCode, message: errorMessage });

      // PROMPT 8 B3: Check for SUSPENDED error code
      if (errorCode === 'SUSPENDED' || (error?.response?.status === 403 && errorCode === 'SUSPENDED')) {
        setIsSuspended(true);
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: { code: errorCode, message: displayMessage },
        }));
      }
    }
  };

  const handleContainerTypeChange = (value: ContainerType) => {
    setState((prev) => ({ ...prev, containerType: value }));
  };

  const handleWorkTypeChange = (value: WorkType) => {
    setState((prev) => ({ ...prev, workType: value }));
  };

  const handlePreview = async (templateId: string) => {
    if (!activeWorkspaceId) {
      return;
    }

    setState((prev) => ({
      ...prev,
      preview: {
        open: true,
        loading: true,
        error: null,
        data: null,
        templateId,
      },
    }));

    try {
      const data = await getPreview(templateId);
      setState((prev) => ({
        ...prev,
        preview: {
          ...prev.preview,
          loading: false,
          data,
        },
      }));
    } catch (error: any) {
      const errorCode = error?.response?.data?.code || error?.code || 'UNKNOWN_ERROR';
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load preview';

      setState((prev) => ({
        ...prev,
        preview: {
          ...prev.preview,
          loading: false,
          error: { code: errorCode, message: errorMessage },
        },
      }));
    }
  };

  const handleUseTemplate = (templateId: string) => {
    setPendingTemplateId(templateId);
    setShowProjectNameModal(true);
  };

  const handleInstantiate = async (projectName: string) => {
    if (!pendingTemplateId || !activeWorkspaceId) {
      return;
    }

    setState((prev) => ({
      ...prev,
      instantiate: { loading: true, error: null },
    }));

    try {
      const result = await instantiateV51(pendingTemplateId, projectName);
      setShowProjectNameModal(false);
      setPendingTemplateId(null);
      setState((prev) => ({
        ...prev,
        instantiate: { loading: false, error: null },
      }));

      // Navigate to project overview on success
      navigate(`/projects/${result.projectId}`, { replace: true });
    } catch (error: any) {
      const errorCode = error?.response?.data?.code || error?.code || 'UNKNOWN_ERROR';
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create project';

      // Error mapping - use centralized helper
      const displayMessage = getApiErrorMessage({ code: errorCode, message: errorMessage });

      setState((prev) => ({
        ...prev,
        instantiate: { loading: false, error: { code: errorCode, message: displayMessage } },
      }));
    }
  };

  const handleClosePreview = () => {
    setState((prev) => ({
      ...prev,
      preview: {
        open: false,
        loading: false,
        error: null,
        data: null,
        templateId: null,
      },
    }));
  };

  const handleUseTemplateFromPreview = () => {
    if (state.preview.templateId) {
      handleUseTemplate(state.preview.templateId);
      handleClosePreview();
    }
  };

  // Patch 1: Workspace gating - DashboardLayout handles this, but keep guard here too
  if (!activeWorkspaceId) {
    return null; // DashboardLayout will show WorkspaceSelectionScreen
  }

  // PROMPT 8 B3: Show suspended screen if access is suspended
  if (isSuspended) {
    return <SuspendedAccessScreen />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Start work</h1>
        <p className="text-gray-600 mt-1">Choose a starting structure</p>
      </div>

      {/* Inputs row */}
      <div className="mb-8 flex gap-4">
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Container type</label>
          <select
            value={state.containerType}
            onChange={(e) => handleContainerTypeChange(e.target.value as ContainerType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PROJECT">Project</option>
            <option value="PROGRAM">Program</option>
          </select>
        </div>

        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Work type</label>
          <select
            value={state.workType}
            onChange={(e) => handleWorkTypeChange(e.target.value as WorkType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="MIGRATION">Migration</option>
            <option value="IMPLEMENTATION">Implementation</option>
            <option value="SYSTEM_TRANSITION">System transition</option>
            <option value="INTEGRATION">Integration</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {state.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{state.error.message}</p>
        </div>
      )}

      {/* Loading state */}
      {state.loading && (
        <div className="space-y-6">
          {/* Recommended skeleton */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>

          {/* More options skeleton */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">More options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!state.loading && state.data && state.data.recommended.length === 0 && state.data.others.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">{PHASE5_1_COPY.NO_TEMPLATES_MATCH}</p>
        </div>
      )}

      {/* Content */}
      {!state.loading && state.data && (state.data.recommended.length > 0 || state.data.others.length > 0) && (
        <div className="space-y-8">
          {/* Recommended section */}
          {state.data.recommended.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.data.recommended.map((card) => (
                  <TemplateCardComponent
                    key={getTemplateKey(card.templateId)}
                    card={card}
                    onUseTemplate={() => handleUseTemplate(card.templateId)}
                    onPreview={() => handlePreview(card.templateId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* More options section */}
          {state.data.others.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">More options</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.data.others.map((card) => (
                  <TemplateCardComponent
                    key={getTemplateKey(card.templateId)}
                    card={card}
                    onUseTemplate={() => handleUseTemplate(card.templateId)}
                    onPreview={() => handlePreview(card.templateId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {state.preview.open && (
        <TemplatePreviewModal
          open={state.preview.open}
          loading={state.preview.loading}
          error={state.preview.error}
          data={state.preview.data}
          onClose={handleClosePreview}
          onUseTemplate={handleUseTemplateFromPreview}
        />
      )}

      {/* Project Name Modal */}
      <ProjectNameModal
        open={showProjectNameModal}
        loading={state.instantiate.loading}
        error={state.instantiate.error}
        onClose={() => {
          setShowProjectNameModal(false);
          setPendingTemplateId(null);
        }}
        onSubmit={handleInstantiate}
      />
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  card: TemplateCard;
  onUseTemplate: () => void;
  onPreview: () => void;
}

function TemplateCardComponent({ card, onUseTemplate, onPreview }: TemplateCardProps) {
  const { isReadOnly, canWrite } = useWorkspaceStore();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <h3 className="text-base font-semibold text-gray-900 mb-2">{card.templateName}</h3>

      <div className="text-sm text-gray-600 mb-3">
        {card.phaseCount} phases • {card.taskCount} tasks
      </div>

      {card.reasonLabels.length > 0 && (
        <div className="mb-3 space-y-1">
          {card.reasonLabels.slice(0, 2).map((label, idx) => (
            <div key={idx} className="text-sm text-gray-700">{label}</div>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-500 mb-4">
        {card.lockSummary || PHASE5_1_COPY.STRUCTURE_LOCKS}
      </div>

      <div className="flex gap-2">
        {isReadOnly ? (
          <div className="flex-1 px-4 py-2 text-sm text-gray-500">
            {PHASE5_1_COPY.READ_ONLY_ACCESS}
          </div>
        ) : (
          <button
            onClick={onUseTemplate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Use template
          </button>
        )}
        <button
          onClick={onPreview}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Preview
        </button>
      </div>
    </div>
  );
}
