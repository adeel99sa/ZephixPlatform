// uiStore.ts - UI state management for Zephix Platform
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BaseStoreState } from '../types/store';
import type { Project } from '../types';

// Enhanced TypeScript interfaces for better type safety
interface UIState extends BaseStoreState {
  // Modal states
  blueprintModalProjectId: string | null;
  
  // Sidebar state
  isSidebarOpen: boolean;
  
  // Selected project state
  selectedProject: Project | null;
  
  // Actions
  openBlueprintModal: (projectId: string) => void;
  closeBlueprintModal: () => void;
  clearModalState: () => void;
  
  // Sidebar actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  
  // Project selection actions
  selectProject: (project: Project | null) => void;
  clearSelectedProject: () => void;
  
  clearError: () => void;
  clearSuccess: () => void;
  setLoading: (loading: boolean, action?: string) => void;
}

// Type for store actions
type UIActions = {
  openBlueprintModal: (projectId: string) => void;
  closeBlueprintModal: () => void;
  clearModalState: () => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  selectProject: (project: Project | null) => void;
  clearSelectedProject: () => void;
  clearError: () => void;
  clearSuccess: () => void;
  setLoading: (loading: boolean, action?: string) => void;
};

// Type for store state
type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      blueprintModalProjectId: null,
      isSidebarOpen: true, // Default to open on desktop
      selectedProject: null,
      isLoading: false,
      loadingAction: undefined,
      loadingStartTime: undefined,
      error: null,
      errorTimestamp: undefined,
      lastSuccess: undefined,
      successTimestamp: undefined,
      
      // Modal actions with performance monitoring
      openBlueprintModal: (projectId) => {
        console.log(`🔍 UIStore: Opening blueprint modal for project: ${projectId}`);
        const startTime = performance.now();
        
        set({ 
          blueprintModalProjectId: projectId,
          lastSuccess: `Opened modal for project: ${projectId}`,
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Modal opened in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      closeBlueprintModal: () => {
        console.log('❌ UIStore: Closing blueprint modal');
        const startTime = performance.now();
        
        set({ 
          blueprintModalProjectId: null,
          lastSuccess: 'Modal closed successfully',
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Modal closed in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      clearModalState: () => {
        console.log('🧹 UIStore: Clearing all modal state');
        set({ 
          blueprintModalProjectId: null,
          lastSuccess: 'Modal state cleared',
          successTimestamp: new Date().toISOString()
        });
      },
      
      // Sidebar actions
      toggleSidebar: () => {
        const { isSidebarOpen } = get();
        console.log(`🔄 UIStore: Toggling sidebar from ${isSidebarOpen} to ${!isSidebarOpen}`);
        const startTime = performance.now();
        
        set({ 
          isSidebarOpen: !isSidebarOpen,
          lastSuccess: `Sidebar ${!isSidebarOpen ? 'opened' : 'closed'}`,
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Sidebar toggled in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      openSidebar: () => {
        console.log('📖 UIStore: Opening sidebar');
        const startTime = performance.now();
        
        set({ 
          isSidebarOpen: true,
          lastSuccess: 'Sidebar opened',
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Sidebar opened in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      closeSidebar: () => {
        console.log('📕 UIStore: Closing sidebar');
        const startTime = performance.now();
        
        set({ 
          isSidebarOpen: false,
          lastSuccess: 'Sidebar closed',
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Sidebar closed in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      // Project selection actions
      selectProject: (project) => {
        const projectName = project?.name || 'none';
        console.log(`🎯 UIStore: Selecting project: ${projectName}`);
        const startTime = performance.now();
        
        set({ 
          selectedProject: project,
          lastSuccess: project ? `Selected project: ${project.name}` : 'Cleared project selection',
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Project selection updated in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      clearSelectedProject: () => {
        console.log('🧹 UIStore: Clearing selected project');
        const startTime = performance.now();
        
        set({ 
          selectedProject: null,
          lastSuccess: 'Project selection cleared',
          successTimestamp: new Date().toISOString()
        });
        
        const endTime = performance.now();
        console.log(`✅ UIStore: Project selection cleared in ${(endTime - startTime).toFixed(2)}ms`);
      },
      
      clearError: () => {
        console.log('🧹 UIStore: Clearing error state');
        set({ 
          error: null,
          errorTimestamp: undefined
        });
      },
      
      clearSuccess: () => {
        console.log('🧹 UIStore: Clearing success state');
        set({ 
          lastSuccess: undefined,
          successTimestamp: undefined
        });
      },
      
      setLoading: (loading, action) => {
        console.log(`⏳ UIStore: Setting loading state to ${loading}${action ? ` for ${action}` : ''}`);
        set({ 
          isLoading: loading,
          loadingAction: action,
          loadingStartTime: loading ? performance.now() : undefined
        });
      },
    }),
    {
      name: 'zephix-ui',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        selectedProject: state.selectedProject,
        blueprintModalProjectId: state.blueprintModalProjectId,
      }),
    }
  )
);
