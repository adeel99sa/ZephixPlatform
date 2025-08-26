import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { QuickActions } from '../QuickActions';

describe('QuickActions', () => {
  it('renders correctly with all quick actions', () => {
    render(<QuickActions />);
    
    // Check for all quick action buttons
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('Invite Team')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<QuickActions />);
    
    // Check for accessible buttons with proper labels
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invite team/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('calls onQuickAction with correct text when buttons are clicked', async () => {
    const onQuickAction = vi.fn();
    const user = userEvent.setup();
    
    render(<QuickActions onQuickAction={onQuickAction} />);
    
    // Click Create Project button
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    await userEvent.click(createProjectButton);
    expect(onQuickAction).toHaveBeenCalledWith('Create new project');
    
    // Click Upload Document button
    const uploadDocumentButton = screen.getByRole('button', { name: /upload document/i });
    await userEvent.click(uploadDocumentButton);
    expect(onQuickAction).toHaveBeenCalledWith('Upload business requirements document');
    
    // Click Invite Team button
    const inviteTeamButton = screen.getByRole('button', { name: /invite team/i });
    await userEvent.click(inviteTeamButton);
    expect(onQuickAction).toHaveBeenCalledWith('Invite team members');
    
    // Click Settings button
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);
    expect(onQuickAction).toHaveBeenCalledWith('Open settings');
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<QuickActions />);
    
    // Tab through all buttons
    await user.tab();
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    expect(createProjectButton).toHaveFocus();
    
    await user.tab();
    const uploadDocumentButton = screen.getByRole('button', { name: /upload document/i });
    expect(uploadDocumentButton).toHaveFocus();
    
    await user.tab();
    const inviteTeamButton = screen.getByRole('button', { name: /invite team/i });
    expect(inviteTeamButton).toHaveFocus();
    
    await user.tab();
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toHaveFocus();
  });

  it('has proper hover states and styling', () => {
    render(<QuickActions />);
    
    // Check for proper styling classes
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    
    buttons.forEach(button => {
      // Check for proper CSS classes for hover states
      expect(button).toHaveClass('hover:bg-gray-700');
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-300');
      expect(button).toHaveClass('hover:scale-[1.015]');
      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-indigo-400');
    });
  });

  it('renders with correct icon colors', () => {
    render(<QuickActions />);
    
    // Check that icons have the correct color classes
    const createProjectIcon = screen.getByRole('button', { name: /create project/i }).querySelector('svg');
    expect(createProjectIcon).toBeInTheDocument();
    
    const uploadDocumentIcon = screen.getByRole('button', { name: /upload document/i }).querySelector('svg');
    expect(uploadDocumentIcon).toBeInTheDocument();
    
    const inviteTeamIcon = screen.getByRole('button', { name: /invite team/i }).querySelector('svg');
    expect(inviteTeamIcon).toBeInTheDocument();
    
    const settingsIcon = screen.getByRole('button', { name: /settings/i }).querySelector('svg');
    expect(settingsIcon).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    render(<QuickActions />);
    
    // Check for proper heading
    const heading = screen.getByRole('heading', { name: /quick actions/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Quick Actions');
  });

  it('handles missing onQuickAction prop gracefully', async () => {
    const user = userEvent.setup();
    
    render(<QuickActions />);
    
    // Should not throw when clicking buttons without onQuickAction
    const createProjectButton = screen.getByRole('button', { name: /create project/i });
    await expect(userEvent.click(createProjectButton)).resolves.not.toThrow();
  });
});
