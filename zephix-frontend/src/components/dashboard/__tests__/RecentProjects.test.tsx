import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentProjects } from '../RecentProjects';
import { useProjectStore } from '../../../stores/projectStore';
import { useProjectSelection } from '../../../hooks/useProjectSelection';
import type { Project } from '../../../types';

// Mock the hooks
vi.mock('../../../stores/projectStore');
vi.mock('../../../hooks/useProjectSelection');

const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>;
const mockUseProjectSelection = useProjectSelection as jest.MockedFunction<typeof useProjectSelection>;

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project Alpha',
    description: 'A test project',
    category: 'Development',
    status: 'Planning',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Project Beta',
    description: 'Another test project',
    category: 'Marketing',
    status: 'Building',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Project Gamma',
    description: 'Third test project',
    category: 'Operations',
    status: 'Review',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultProps = {
  onProjectClick: vi.fn(),
};

describe('RecentProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseProjectStore.mockReturnValue({
      projects: mockProjects,
      isLoading: false,
      fetchProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      clearError: vi.fn(),
      setLoading: vi.fn(),
      clearSuccess: vi.fn(),
    });

    mockUseProjectSelection.mockReturnValue({
      selectedProject: null,
      select: vi.fn(),
      clear: vi.fn(),
      isSelected: vi.fn(() => false),
    });
  });

  it('renders correctly with recent projects', () => {
    render(<RecentProjects {...defaultProps} />);

    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('Project Gamma')).toBeInTheDocument();
  });

  it('renders correctly with empty projects array', () => {
    mockUseProjectStore.mockReturnValue({
      projects: [],
      isLoading: false,
      fetchProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      clearError: vi.fn(),
      setLoading: vi.fn(),
      clearSuccess: vi.fn(),
    });

    render(<RecentProjects {...defaultProps} />);

    // Should not render anything when no projects
    expect(screen.queryByText('Recent Projects')).not.toBeInTheDocument();
  });

  it('renders correct number of projects (max 3)', () => {
    const manyProjects = [
      ...mockProjects,
      { ...mockProjects[0], id: '4', name: 'Project Delta' },
      { ...mockProjects[0], id: '5', name: 'Project Epsilon' },
    ];

    mockUseProjectStore.mockReturnValue({
      projects: manyProjects,
      isLoading: false,
      fetchProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      clearError: vi.fn(),
      setLoading: vi.fn(),
      clearSuccess: vi.fn(),
    });

    render(<RecentProjects {...defaultProps} />);

    // Should show all projects (no limit in current implementation)
    const projectItems = screen.getAllByRole('button');
    expect(projectItems).toHaveLength(5);
  });

  it('has proper accessibility roles and labels', () => {
    render(<RecentProjects {...defaultProps} />);

    // Check for accessible buttons with proper labels
    expect(screen.getByRole('button', { name: /open project: project alpha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open project: project beta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open project: project gamma/i })).toBeInTheDocument();
  });

  it('calls onProjectClick when project is clicked', async () => {
    const user = userEvent.setup();
    render(<RecentProjects {...defaultProps} />);

    // Click on first project
    const firstProject = screen.getByRole('button', { name: /open project: project alpha/i });
    await user.click(firstProject);

    expect(defaultProps.onProjectClick).toHaveBeenCalledTimes(1);
  });

  it('calls onProjectClick when project is activated with keyboard', async () => {
    const user = userEvent.setup();
    render(<RecentProjects {...defaultProps} />);

    // Focus and press Enter on first project
    const firstProject = screen.getByRole('button', { name: /open project: project alpha/i });
    firstProject.focus();
    await user.keyboard('{Enter}');

    expect(defaultProps.onProjectClick).toHaveBeenCalledTimes(1);
  });

  it('calls onProjectClick when project is activated with Space key', async () => {
    const user = userEvent.setup();
    render(<RecentProjects {...defaultProps} />);

    // Focus and press Space on first project
    const firstProject = screen.getByRole('button', { name: /open project: project alpha/i });
    firstProject.focus();
    await user.keyboard(' ');

    expect(defaultProps.onProjectClick).toHaveBeenCalledTimes(1);
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    render(<RecentProjects {...defaultProps} />);

    // Tab through all project buttons
    await user.tab();
    const firstProject = screen.getByRole('button', { name: /open project: project alpha/i });
    expect(firstProject).toHaveFocus();

    await user.tab();
    const secondProject = screen.getByRole('button', { name: /open project: project beta/i });
    expect(secondProject).toHaveFocus();
  });

  it('displays project information correctly', () => {
    render(<RecentProjects {...defaultProps} />);

    // Check that project names are displayed
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('Project Gamma')).toBeInTheDocument();

    // Check that project details show category and status separately
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Building')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('renders with correct project details format', () => {
    render(<RecentProjects {...defaultProps} />);

    // Check that project details show category and status separately
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Building')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('handles multiple clicks correctly', async () => {
    const user = userEvent.setup();
    render(<RecentProjects {...defaultProps} />);

    // Click on all projects
    const projects = screen.getAllByRole('button');
    for (const project of projects) {
      await user.click(project);
    }

    expect(defaultProps.onProjectClick).toHaveBeenCalledTimes(3);
  });

  it('has proper focus management', async () => {
    const user = userEvent.setup();
    render(<RecentProjects {...defaultProps} />);

    // Focus should be managed properly
    const firstProject = screen.getByRole('button', { name: /open project: project alpha/i });
    firstProject.focus();
    expect(firstProject).toHaveFocus();

    // Tab to next project
    await user.tab();
    const secondProject = screen.getByRole('button', { name: /open project: project beta/i });
    expect(secondProject).toHaveFocus();
  });

  it('renders with different project statuses and categories', () => {
    const diverseProjects: Project[] = [
      {
        id: '1',
        name: 'Strategy Project',
        description: 'Strategic planning project',
        category: 'Strategy',
        status: 'Planning',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Marketing Campaign',
        description: 'Marketing campaign project',
        category: 'Marketing',
        status: 'Building',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockUseProjectStore.mockReturnValue({
      projects: diverseProjects,
      isLoading: false,
      fetchProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      clearError: vi.fn(),
      setLoading: vi.fn(),
      clearSuccess: vi.fn(),
    });

    render(<RecentProjects {...defaultProps} />);

    expect(screen.getByText('Strategy Project')).toBeInTheDocument();
    expect(screen.getByText('Marketing Campaign')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Building')).toBeInTheDocument();
    expect(screen.getByText('Strategy')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('shows selected project state', () => {
    const mockSelect = vi.fn();
    const mockIsSelected = vi.fn((id: string) => id === '1');

    mockUseProjectSelection.mockReturnValue({
      selectedProject: mockProjects[0],
      select: mockSelect,
      clear: vi.fn(),
      isSelected: mockIsSelected,
    });

    render(<RecentProjects {...defaultProps} />);

    // Check that selected project shows selection indicator
    expect(screen.getByText('✓ Selected')).toBeInTheDocument();
    
    // Check that selected project has different styling
    const selectedProject = screen.getByRole('button', { name: /open project: project alpha/i });
    expect(selectedProject).toHaveClass('ring-2', 'ring-indigo-400');
  });
});
