import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock stores for testing
const mockAuthStore = {
  user: {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  clearAuth: vi.fn(),
};

const mockProjectStore = {
  projects: [
    {
      id: '1',
      name: 'Test Project',
      status: 'Planning' as const,
      health: 'On Track' as const,
      progress: 25,
      milestones: [],
      risks: [],
      opportunities: [],
      team: [],
      priority: 'High' as const,
      category: 'Development' as const,
    },
  ],
  isLoading: false,
  error: null,
  fetchProjects: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  clearError: vi.fn(),
  setLoading: vi.fn(),
};

const mockUIStore = {
  blueprintModalProjectId: null,
  openBlueprintModal: vi.fn(),
  closeBlueprintModal: vi.fn(),
  clearModalState: vi.fn(),
  clearError: vi.fn(),
  clearSuccess: vi.fn(),
  setLoading: vi.fn(),
};

// Mock the stores
vi.mock('../stores/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('../stores/projectStore', () => ({
  useProjectStore: () => mockProjectStore,
}));

vi.mock('../stores/uiStore', () => ({
  useUIStore: () => mockUIStore,
}));

// Custom render function with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Export mock stores for test access
export { mockAuthStore, mockProjectStore, mockUIStore };
