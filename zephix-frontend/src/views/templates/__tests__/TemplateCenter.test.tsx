import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { TemplateCenter } from '../TemplateCenter';
import * as templatesApi from '@/features/templates/api';
import { useWorkspaceStore } from '@/state/workspace.store';

// Mock the API
vi.mock('@/features/templates/api');
vi.mock('@/state/workspace.store');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockRecommendations = {
  recommended: [
    {
      templateId: 'template-1',
      templateName: 'Template 1',
      containerType: 'PROJECT' as const,
      workTypeTags: ['MIGRATION'],
      scopeTags: ['SINGLE_PROJECT'],
      phaseCount: 2,
      taskCount: 5,
      lockSummary: 'Structure locks when work starts',
      setupTimeLabel: 'Short',
      reasonCodes: ['MATCH_WORK_TYPE'],
      reasonLabels: ['Matches selected work type'],
    },
  ],
  others: [
    {
      templateId: 'template-2',
      templateName: 'Template 2',
      containerType: 'PROJECT' as const,
      workTypeTags: ['IMPLEMENTATION'],
      scopeTags: ['SINGLE_PROJECT'],
      phaseCount: 3,
      taskCount: 8,
      lockSummary: 'Structure locks when work starts',
      setupTimeLabel: 'Medium',
      reasonCodes: ['MATCH_SCOPE'],
      reasonLabels: ['Fits this scope'],
    },
  ],
  inputsEcho: {
    containerType: 'PROJECT' as const,
    workType: 'MIGRATION',
  },
  generatedAt: '2024-01-15T10:30:00.000Z',
};

const mockPreview = {
  templateId: 'template-1',
  templateName: 'Template 1',
  phaseCount: 2,
  taskCount: 5,
  phases: [
    { name: 'Phase 1', sortOrder: 0, isMilestone: false, taskCount: 3 },
    { name: 'Phase 2', sortOrder: 1, isMilestone: true, taskCount: 2 },
  ],
  defaultTaskStatuses: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
  lockPolicy: {
    structureLocksOnStart: true,
    lockedItems: ['phaseOrder', 'phaseCount', 'reportingKeys'],
  },
  allowedBeforeStart: ['renamePhases', 'adjustMilestones', 'addTasks'],
  allowedAfterStart: ['addTasks', 'renameTasks', 'updateStatus'],
};

describe('TemplateCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock workspace store
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeWorkspaceId: 'workspace-123',
      setActiveWorkspace: vi.fn(),
      workspaceRole: null,
      setWorkspaceRole: vi.fn(),
      isReadOnly: false,
      canWrite: true,
    });
  });

  it('renders two dropdowns', async () => {
    vi.mocked(templatesApi.getRecommendations).mockResolvedValue(mockRecommendations);

    render(
      <BrowserRouter>
        <TemplateCenter />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/container type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/work type/i)).toBeInTheDocument();
    });
  });

  it('renders Recommended and More options sections when API returns data', async () => {
    vi.mocked(templatesApi.getRecommendations).mockResolvedValue(mockRecommendations);

    render(
      <BrowserRouter>
        <TemplateCenter />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeInTheDocument();
      expect(screen.getByText('More options')).toBeInTheDocument();
      expect(screen.getByText('Template 1')).toBeInTheDocument();
      expect(screen.getByText('Template 2')).toBeInTheDocument();
    });
  });

  it('opens preview modal when Preview is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(templatesApi.getRecommendations).mockResolvedValue(mockRecommendations);
    vi.mocked(templatesApi.getPreview).mockResolvedValue(mockPreview);

    render(
      <BrowserRouter>
        <TemplateCenter />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByText('Preview');
    await user.click(previewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument(); // Modal header
      expect(screen.getByText(/Structure locks when work starts/i)).toBeInTheDocument();
    });

    expect(templatesApi.getPreview).toHaveBeenCalledWith('template-1');
  });

  it('renders templates in API order without sorting', async () => {
    // Shuffled order from API
    const shuffledRecommendations = {
      ...mockRecommendations,
      recommended: [
        mockRecommendations.recommended[0],
        mockRecommendations.others[0],
      ],
      others: [],
    };

    vi.mocked(templatesApi.getRecommendations).mockResolvedValue(shuffledRecommendations);

    render(
      <BrowserRouter>
        <TemplateCenter />
      </BrowserRouter>
    );

    await waitFor(() => {
      const templateNames = screen.getAllByText(/Template \d/);
      // Should render in API order: Template 1, then Template 2
      expect(templateNames[0]).toHaveTextContent('Template 1');
      expect(templateNames[1]).toHaveTextContent('Template 2');
    });
  });

  it('hides Use template button and shows Read only access for stakeholder', async () => {
    vi.mocked(templatesApi.getRecommendations).mockResolvedValue(mockRecommendations);

    // Mock stakeholder role
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeWorkspaceId: 'workspace-123',
      setActiveWorkspace: vi.fn(),
      workspaceRole: 'stakeholder' as const,
      setWorkspaceRole: vi.fn(),
      isReadOnly: true,
      canWrite: false,
    });

    render(
      <BrowserRouter>
        <TemplateCenter />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
    });

    // Should not see "Use template" buttons
    const useTemplateButtons = screen.queryAllByText('Use template');
    expect(useTemplateButtons).toHaveLength(0);

    // Should see "Read only access" text
    const readOnlyTexts = screen.getAllByText('Read only access');
    expect(readOnlyTexts.length).toBeGreaterThan(0);

    // Should still see "Preview" buttons
    const previewButtons = screen.getAllByText('Preview');
    expect(previewButtons.length).toBeGreaterThan(0);
  });
});

