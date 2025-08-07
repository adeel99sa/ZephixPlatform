import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectStats } from '../ProjectStats';
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

describe('ProjectStats', () => {
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

  it('renders correctly with project statistics', () => {
    render(<ProjectStats />);

    expect(screen.getByText('Project Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
  });

  it('displays correct total project count', () => {
    render(<ProjectStats />);

    const totalProjectsLabel = screen.getByText('Total Projects');
    expect(totalProjectsLabel).toHaveClass('text-sm', 'text-gray-300');
    
    const totalProjectsCount = screen.getByText('3', { selector: 'span.text-2xl' });
    expect(totalProjectsCount).toHaveClass('text-2xl', 'font-bold', 'text-indigo-400');
  });

  it('displays correct active project count', () => {
    render(<ProjectStats />);

    const activeProjectsLabel = screen.getByText('Active Projects');
    expect(activeProjectsLabel).toHaveClass('text-sm', 'text-gray-300');
    
    const activeProjectsCount = screen.getByText('3', { selector: 'span.text-lg' });
    expect(activeProjectsCount).toHaveClass('text-lg', 'font-semibold', 'text-green-400');
  });

  it('calculates active projects correctly', () => {
    const mixedProjects: Project[] = [
      { ...mockProjects[0], status: 'Planning' },
      { ...mockProjects[1], status: 'Building' },
      { ...mockProjects[2], status: 'Review' },
      { ...mockProjects[0], id: '4', name: 'Project Delta', status: 'Complete' },
    ];

    mockUseProjectStore.mockReturnValue({
      projects: mixedProjects,
      isLoading: false,
      fetchProjects: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      clearError: vi.fn(),
      setLoading: vi.fn(),
      clearSuccess: vi.fn(),
    });

    render(<ProjectStats />);

    // Should show 3 active projects (Planning, Building, Review)
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows selected project when available', () => {
    const selectedProject = mockProjects[0];
    
    mockUseProjectSelection.mockReturnValue({
      selectedProject,
      select: vi.fn(),
      clear: vi.fn(),
      isSelected: vi.fn(() => true),
    });

    render(<ProjectStats />);

    expect(screen.getByText('Selected Project')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Development • Planning')).toBeInTheDocument();
  });

  it('does not show selected project section when no project is selected', () => {
    render(<ProjectStats />);

    expect(screen.queryByText('Selected Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
  });

  it('handles empty projects array', () => {
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

    render(<ProjectStats />);

    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2); // Total and Active projects
  });

  it('has proper accessibility structure', () => {
    render(<ProjectStats />);

    // Check for proper heading
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Project Overview');

    // Check for proper semantic structure
    const container = screen.getByText('Project Overview').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('displays different project statuses correctly', () => {
    const diverseProjects: Project[] = [
      { ...mockProjects[0], status: 'Planning' },
      { ...mockProjects[1], status: 'Building' },
      { ...mockProjects[2], status: 'Review' },
      { ...mockProjects[0], id: '4', name: 'Project Delta', status: 'Complete' },
      { ...mockProjects[0], id: '5', name: 'Project Epsilon', status: 'On Hold' },
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

    render(<ProjectStats />);

    // Should show 3 active projects (Planning, Building, Review)
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('updates when selected project changes', () => {
    const { rerender } = render(<ProjectStats />);

    // Initially no selected project
    expect(screen.queryByText('Selected Project')).not.toBeInTheDocument();

    // Update to have selected project
    mockUseProjectSelection.mockReturnValue({
      selectedProject: mockProjects[1],
      select: vi.fn(),
      clear: vi.fn(),
      isSelected: vi.fn(() => true),
    });

    rerender(<ProjectStats />);

    expect(screen.getByText('Selected Project')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('Marketing • Building')).toBeInTheDocument();
  });
});
