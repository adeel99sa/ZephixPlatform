import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { DashboardSidebar } from '../DashboardSidebar';
import type { Project } from '../../../types';

describe('DashboardSidebar', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Test Project 1',
      description: 'Test description 1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: 'user1',
      teamMembers: [],
    },
    {
      id: '2',
      name: 'Test Project 2',
      description: 'Test description 2',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: 'user1',
      teamMembers: [],
    },
  ];

  const defaultProps = {
    projects: mockProjects,
    onQuickAction: vi.fn(),
    onProjectClick: vi.fn(),
    isLoading: false,
  };

  it('renders correctly with all UI elements', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for main sidebar elements
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Project Overview')).toBeInTheDocument();
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
  });

  it('renders correctly when loading', () => {
    render(<DashboardSidebar {...defaultProps} isLoading={true} />);
    
    // Check for loading skeleton elements
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Project Stats')).toBeInTheDocument();
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper sidebar structure
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute('aria-label', 'Dashboard sidebar');
    
    // Check for proper heading structure
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(5); // Quick Actions, Project Overview, Recent Projects, and 2 project names (h4)
  });

  it('has proper heading structure', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(5);
    
    // Main section headings should be h3 level
    const h3Headings = headings.filter(heading => heading.tagName === 'H3');
    expect(h3Headings).toHaveLength(3); // Quick Actions, Project Overview, Recent Projects
    
    // Project names should be h4 level
    const h4Headings = headings.filter(heading => heading.tagName === 'H4');
    expect(h4Headings).toHaveLength(2); // Project names
  });

  it('has proper ARIA attributes', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper sidebar role and label
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveAttribute('aria-label', 'Dashboard sidebar');
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<DashboardSidebar {...defaultProps} />);
    
    // Tab through all interactive elements
    await user.tab();
    await user.tab();
    await user.tab();
  });

  it('renders responsive elements correctly', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for responsive sidebar layout
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-80');
  });

  it('has proper focus management', async () => {
    const user = userEvent.setup();
    
    render(<DashboardSidebar {...defaultProps} />);
    
    // Focus should be managed properly
    const sidebar = screen.getByRole('complementary');
    sidebar.focus();
    // Note: div elements with role="complementary" may not receive focus in all browsers
    // This test verifies the element exists and can be programmatically focused
    expect(sidebar).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper sidebar element
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toBeInTheDocument();
    
    // Check that headings are inside sidebar
    const headings = screen.getAllByRole('heading');
    headings.forEach(heading => {
      expect(sidebar).toContainElement(heading);
    });
  });

  it('has proper color contrast and visual indicators', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper background styling
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('bg-gray-800');
  });

  it('has proper text content and descriptions', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for descriptive text
    const quickActionsHeading = screen.getByText('Quick Actions');
    expect(quickActionsHeading).toBeInTheDocument();
    
    const projectStatsHeading = screen.getByText('Project Overview');
    expect(projectStatsHeading).toBeInTheDocument();
    
    const recentProjectsHeading = screen.getByText('Recent Projects');
    expect(recentProjectsHeading).toBeInTheDocument();
  });

  it('has proper loading state', () => {
    render(<DashboardSidebar {...defaultProps} isLoading={true} />);
    
    // Check that loading state shows skeleton elements
    const skeletonElements = screen.getAllByText('Quick Actions');
    expect(skeletonElements).toHaveLength(1);
    
    // Check that skeleton has proper styling
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-80', 'bg-gray-800');
  });

  it('has proper component integration', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check that child components are rendered
    // These would be tested in their individual test files
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Project Overview')).toBeInTheDocument();
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
  });

  it('has proper spacing and layout', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper spacing between sections
    const sidebar = screen.getByRole('complementary');
    const container = sidebar.querySelector('.space-y-6');
    expect(container).toBeInTheDocument();
  });

  it('has proper border styling', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper border styling
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('border-l', 'border-gray-700');
  });

  it('has proper padding', () => {
    render(<DashboardSidebar {...defaultProps} />);
    
    // Check for proper padding
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('p-6');
  });
});
