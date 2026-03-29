import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateFromTemplateWizard from '@/features/templates/wizard/CreateFromTemplateWizard';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams('workspaceId=ws-1')],
  };
});

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: (selector: any) =>
    selector({
      activeWorkspaceId: 'ws-1',
      setActiveWorkspace: vi.fn(),
    }),
}));

vi.mock('@/features/workspaces/api', () => ({
  listWorkspaces: vi.fn().mockResolvedValue([
    {
      id: 'ws-1',
      name: 'Engineering',
      defaultTemplateId: 'tpl-1',
      allowedTemplateIds: ['tpl-1'],
    },
  ]),
}));

vi.mock('@/features/projects/api', () => ({
  createProject: vi.fn(),
}));

vi.mock('@/features/templates/api', () => ({
  listTemplates: vi.fn().mockResolvedValue([
    {
      id: 'tpl-1',
      name: 'Agile Delivery',
      description: 'Allowed template',
      templateVersion: 1,
      category: 'Software Development',
      complexity: 'medium',
      includedViews: ['list', 'board'],
      includedFields: ['status'],
      includedStatuses: ['TODO'],
      structureType: 'phased',
      defaultImportOptions: {
        includeViews: true,
        includeTasks: true,
        includePhases: true,
        includeMilestones: true,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
      executionConfiguration: {
        views: ['list', 'board'],
        fields: ['status'],
        statuses: ['TODO'],
        structureType: 'phased',
        documents: ['Documents'],
        taskLayout: 'phased',
      },
      governanceConfiguration: {
        capacityPolicy: 'workspace_default',
        budgetPolicy: 'workspace_default',
        requiredArtifacts: ['Risk Log'],
        riskModel: 'preset',
        phaseGates: [],
        approvalRules: [],
        auditRequirements: ['project_creation'],
        methodologyMapping: 'agile',
      },
    },
    {
      id: 'tpl-2',
      name: 'Blocked Template',
      description: 'Not allowed',
      templateVersion: 1,
      category: 'Project Management',
      complexity: 'low',
      includedViews: ['list'],
      includedFields: ['status'],
      includedStatuses: ['TODO'],
      structureType: 'lightweight',
      defaultImportOptions: {
        includeViews: true,
        includeTasks: true,
        includePhases: true,
        includeMilestones: true,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
      executionConfiguration: {
        views: ['list'],
        fields: ['status'],
        statuses: ['TODO'],
        structureType: 'lightweight',
        documents: ['Documents'],
        taskLayout: 'flat',
      },
      governanceConfiguration: {
        capacityPolicy: 'optional',
        budgetPolicy: 'optional',
        requiredArtifacts: [],
        riskModel: 'standard',
        phaseGates: [],
        approvalRules: [],
        auditRequirements: [],
        methodologyMapping: 'agile',
      },
    },
  ]),
  getTemplateDetail: vi.fn().mockResolvedValue({
    id: 'tpl-1',
    name: 'Agile Delivery',
    description: 'Allowed template',
    templateVersion: 1,
    category: 'Software Development',
    complexity: 'medium',
    includedViews: ['list', 'board'],
    includedFields: ['status'],
    includedStatuses: ['TODO'],
    structureType: 'phased',
    defaultImportOptions: {
      includeViews: true,
      includeTasks: true,
      includePhases: true,
      includeMilestones: true,
      includeCustomFields: false,
      includeDependencies: false,
      remapDates: true,
    },
    executionConfiguration: {
      views: ['list', 'board'],
      fields: ['status'],
      statuses: ['TODO'],
      structureType: 'phased',
      documents: ['Documents'],
      taskLayout: 'phased',
    },
    governanceConfiguration: {
      capacityPolicy: 'workspace_default',
      budgetPolicy: 'workspace_default',
      requiredArtifacts: ['Risk Log'],
      riskModel: 'preset',
      phaseGates: [],
      approvalRules: [],
      auditRequirements: ['project_creation'],
      methodologyMapping: 'agile',
    },
  }),
  createProjectFromTemplate: vi.fn(),
}));

describe('CreateFromTemplateWizard governance summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides templates outside allowlist and shows governance summary before create', async () => {
    render(
      <MemoryRouter>
        <CreateFromTemplateWizard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByText('Step 2 · Choose template')).toBeInTheDocument();
    });
    expect(screen.getByText('Agile Delivery')).toBeInTheDocument();
    expect(screen.queryByText('Blocked Template')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByText('Governance summary')).toBeInTheDocument();
    });
    expect(screen.getByText(/Capacity policy:/)).toBeInTheDocument();
    expect(screen.getByText(/Risk model:/)).toBeInTheDocument();
  });
});
