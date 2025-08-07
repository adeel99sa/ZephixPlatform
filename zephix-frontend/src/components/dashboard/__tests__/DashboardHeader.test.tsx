import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader } from '../DashboardHeader';
import { useUser } from '../../../hooks/useUser';
import { useSidebar } from '../../../hooks/useSidebar';
import type { User } from '../../../types';

// Mock the hooks
vi.mock('../../../hooks/useUser');
vi.mock('../../../hooks/useSidebar');

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseSidebar = useSidebar as jest.MockedFunction<typeof useSidebar>;

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  emailVerified: true,
  mfaEnabled: false,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultProps = {
  onCreateProject: vi.fn(),
};

describe('DashboardHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseUser.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: vi.fn().mockResolvedValue({ success: true }),
      getCurrentUser: vi.fn(),
      checkAuth: vi.fn(),
    });

    mockUseSidebar.mockReturnValue({
      isOpen: true,
      toggle: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    });
  });

  it('renders correctly with user information', () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByText('Zephix AI')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays user name correctly', () => {
    render(<DashboardHeader {...defaultProps} />);

    const userName = screen.getByText('John Doe');
    expect(userName).toBeInTheDocument();
    expect(userName).toHaveClass('hidden', 'sm:block');
  });

  it('calls onCreateProject when create project button is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    const createButton = screen.getByRole('button', { name: /create new project/i });
    await user.click(createButton);

    expect(defaultProps.onCreateProject).toHaveBeenCalledTimes(1);
  });

  it('calls logout when logout button is clicked', async () => {
    const mockLogout = vi.fn().mockResolvedValue({ success: true });
    mockUseUser.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
      getCurrentUser: vi.fn(),
      checkAuth: vi.fn(),
    });

    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    const logoutButton = screen.getByRole('button', { name: /sign out of your account/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('handles logout error gracefully', async () => {
    const mockLogout = vi.fn().mockResolvedValue({ 
      success: false, 
      error: { message: 'Logout failed' } 
    });
    mockUseUser.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
      getCurrentUser: vi.fn(),
      checkAuth: vi.fn(),
    });

    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<DashboardHeader {...defaultProps} />);

    const logoutButton = screen.getByRole('button', { name: /sign out of your account/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', 'Logout failed');
    
    consoleSpy.mockRestore();
  });

  it('renders sidebar toggle button on mobile', () => {
    render(<DashboardHeader {...defaultProps} />);

    const sidebarToggle = screen.getByRole('button', { name: /close sidebar/i });
    expect(sidebarToggle).toBeInTheDocument();
    expect(sidebarToggle).toHaveClass('lg:hidden');
  });

  it('toggles sidebar when toggle button is clicked', async () => {
    const mockToggle = vi.fn();
    mockUseSidebar.mockReturnValue({
      isOpen: true,
      toggle: mockToggle,
      open: vi.fn(),
      close: vi.fn(),
    });

    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    const sidebarToggle = screen.getByRole('button', { name: /close sidebar/i });
    await user.click(sidebarToggle);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('shows correct sidebar toggle icon based on state', () => {
    // Test open state
    mockUseSidebar.mockReturnValue({
      isOpen: true,
      toggle: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    });

    const { rerender } = render(<DashboardHeader {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();

    // Test closed state
    mockUseSidebar.mockReturnValue({
      isOpen: false,
      toggle: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    });

    rerender(<DashboardHeader {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<DashboardHeader {...defaultProps} />);

    // Check for proper ARIA labels
    expect(screen.getByRole('button', { name: /create new project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out of your account/i })).toBeInTheDocument();
  });

  it('renders with proper styling classes', () => {
    render(<DashboardHeader {...defaultProps} />);

    // Check for proper CSS classes
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('glass');
    expect(header).toHaveClass('border-b');
    expect(header).toHaveClass('border-gray-700/50');

    const createButton = screen.getByRole('button', { name: /create new project/i });
    expect(createButton).toHaveClass('bg-gradient-to-r');
    expect(createButton).toHaveClass('from-indigo-600');
    expect(createButton).toHaveClass('to-blue-600');
  });

  it('handles user with missing name gracefully', () => {
    const userWithoutName = { ...mockUser, firstName: undefined, lastName: undefined };
    mockUseUser.mockReturnValue({
      user: userWithoutName,
      isAuthenticated: true,
      logout: vi.fn().mockResolvedValue({ success: true }),
      getCurrentUser: vi.fn(),
      checkAuth: vi.fn(),
    });

    render(<DashboardHeader {...defaultProps} />);

    // Should not crash and should still render the header
    expect(screen.getByText('Zephix AI')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('handles null user gracefully', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn().mockResolvedValue({ success: true }),
      getCurrentUser: vi.fn(),
      checkAuth: vi.fn(),
    });

    render(<DashboardHeader {...defaultProps} />);

    // Should not crash and should still render the header
    expect(screen.getByText('Zephix AI')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    // Tab through all interactive elements
    await user.tab();
    const sidebarButton = screen.getByRole('button', { name: /close sidebar/i });
    expect(sidebarButton).toHaveFocus();

    await user.tab();
    const createButton = screen.getByRole('button', { name: /create new project/i });
    expect(createButton).toHaveFocus();

    await user.tab();
    const userProfileButton = screen.getByRole('button', { name: /user profile/i });
    expect(userProfileButton).toHaveFocus();

    await user.tab();
    const logoutButton = screen.getByRole('button', { name: /sign out of your account/i });
    expect(logoutButton).toHaveFocus();
  });

  it('maintains proper responsive design', () => {
    render(<DashboardHeader {...defaultProps} />);

    // Check that user name is hidden on small screens
    const userName = screen.getByText('John Doe');
    expect(userName).toHaveClass('hidden', 'sm:block');

    // Check that sidebar toggle is hidden on large screens
    const sidebarToggle = screen.getByRole('button', { name: /close sidebar/i });
    expect(sidebarToggle).toHaveClass('lg:hidden');
  });
});
