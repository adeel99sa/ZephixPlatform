import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import { QuickActions } from '../QuickActions';

describe('QuickActions', () => {
  const defaultProps = {
    onQuickAction: vi.fn(),
  };

  it('renders correctly with all quick actions', () => {
    render(<QuickActions {...defaultProps} />);
    
    // Check for main heading
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    
    // Check for all quick action buttons
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByText('View Projects')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('AI Help')).toBeInTheDocument();
  });

  it('renders correct number of action buttons', () => {
    render(<QuickActions {...defaultProps} />);
    
    const actionButtons = screen.getAllByRole('button');
    expect(actionButtons).toHaveLength(4);
  });

  it('has proper accessibility roles and labels', () => {
    render(<QuickActions {...defaultProps} />);
    
    // Check for proper heading
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Quick Actions');
    
    // Check for accessible buttons with proper labels
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view projects/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ai help/i })).toBeInTheDocument();
  });

  it('calls onQuickAction with correct text when buttons are clicked', async () => {
    const onQuickAction = vi.fn();
    const userEvent = (await import('@testing-library/user-event')).default.setup();
    
    render(<QuickActions {...defaultProps} onQuickAction={onQuickAction} />);
    
    // Click Create Project button
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    await userEvent.click(createProjectButton);
    expect(onQuickAction).toHaveBeenCalledWith('Create a new project');
    
    // Click View Projects button
    const viewProjectsButton = screen.getByRole('button', { name: /view projects/i });
    await userEvent.click(viewProjectsButton);
    expect(onQuickAction).toHaveBeenCalledWith('Show me my projects');
    
    // Click Analytics button
    const analyticsButton = screen.getByRole('button', { name: /analytics/i });
    await userEvent.click(analyticsButton);
    expect(onQuickAction).toHaveBeenCalledWith('Show me project analytics');
    
    // Click AI Help button
    const aiHelpButton = screen.getByRole('button', { name: /ai help/i });
    await userEvent.click(aiHelpButton);
    expect(onQuickAction).toHaveBeenCalledWith('What can you help me with?');
  });

  it('has proper keyboard navigation support', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup();
    
    render(<QuickActions {...defaultProps} />);
    
    // Tab through all buttons
    await userEvent.tab();
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    expect(createProjectButton).toHaveFocus();
    
    await userEvent.tab();
    const viewProjectsButton = screen.getByRole('button', { name: /view projects/i });
    expect(viewProjectsButton).toHaveFocus();
    
    await userEvent.tab();
    const analyticsButton = screen.getByRole('button', { name: /analytics/i });
    expect(analyticsButton).toHaveFocus();
    
    await userEvent.tab();
    const aiHelpButton = screen.getByRole('button', { name: /ai help/i });
    expect(aiHelpButton).toHaveFocus();
  });

  it('has proper ARIA attributes', () => {
    render(<QuickActions {...defaultProps} />);
    
    // Check for decorative icons with aria-hidden
    const icons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
    
    // Check that all buttons have proper aria-label attributes
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('has proper hover states and styling', () => {
    render(<QuickActions {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      // Check for proper CSS classes for hover states
      expect(button).toHaveClass('hover:bg-gray-700/50');
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-200');
    });
  });

  it('renders with correct icon colors', () => {
    render(<QuickActions {...defaultProps} />);
    
    // Check that icons have the correct color classes
    const createProjectIcon = screen.getByRole('button', { name: /create project/i }).querySelector('.text-indigo-400');
    expect(createProjectIcon).toBeInTheDocument();
    
    const viewProjectsIcon = screen.getByRole('button', { name: /view projects/i }).querySelector('.text-green-400');
    expect(viewProjectsIcon).toBeInTheDocument();
    
    const analyticsIcon = screen.getByRole('button', { name: /analytics/i }).querySelector('.text-blue-400');
    expect(analyticsIcon).toBeInTheDocument();
    
    const aiHelpIcon = screen.getByRole('button', { name: /ai help/i }).querySelector('.text-purple-400');
    expect(aiHelpIcon).toBeInTheDocument();
  });

  it('has proper focus management', async () => {
    const userEvent = (await import('@testing-library/user-event')).default.setup();
    
    render(<QuickActions {...defaultProps} />);
    
    // Focus should be managed properly
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    createProjectButton.focus();
    expect(createProjectButton).toHaveFocus();
  });

  it('calls onQuickAction multiple times correctly', async () => {
    const onQuickAction = vi.fn();
    const userEvent = (await import('@testing-library/user-event')).default.setup();
    
    render(<QuickActions {...defaultProps} onQuickAction={onQuickAction} />);
    
    // Click multiple buttons
    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      await userEvent.click(button);
    }
    
    expect(onQuickAction).toHaveBeenCalledTimes(4);
  });
});
