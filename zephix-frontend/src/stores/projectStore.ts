import { create } from 'zustand';
import { mockApi } from './mockApi';
import type { Project } from '../types';
import type { BaseStoreState, AsyncResult } from '../types/store';
import { createError } from '../types/store';

// Enhanced TypeScript interfaces for better type safety
interface ProjectState extends BaseStoreState {
  // State properties
  projects: Project[];
  
  // Actions
  fetchProjects: () => Promise<AsyncResult<Project[]>>;
  addProject: (project: Project) => Promise<AsyncResult<Project>>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<AsyncResult<Project>>;
  deleteProject: (projectId: string) => Promise<AsyncResult<void>>;
  clearError: () => void;
  setLoading: (loading: boolean, action?: string) => void;
  clearSuccess: () => void;
}

// Type for store actions
type ProjectActions = {
  fetchProjects: () => Promise<AsyncResult<Project[]>>;
  addProject: (project: Project) => Promise<AsyncResult<Project>>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<AsyncResult<Project>>;
  deleteProject: (projectId: string) => Promise<AsyncResult<void>>;
  clearError: () => void;
  setLoading: (loading: boolean, action?: string) => void;
  clearSuccess: () => void;
};

// Type for store state
type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: [],
  isLoading: false,
  loadingAction: undefined,
  loadingStartTime: undefined,
  error: null,
  errorTimestamp: undefined,
  lastSuccess: undefined,
  successTimestamp: undefined,
  
  // Actions with enhanced error handling and performance monitoring
  fetchProjects: async () => {
    const startTime = performance.now();
    const action = 'fetchProjects';
    
    console.log(`🔄 ProjectStore: Starting ${action}...`);
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      const projects = await mockApi.getProjects();
      const endTime = performance.now();
      
      console.log(`✅ ProjectStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 ProjectStore: Loaded ${projects.length} projects`);
      
      set({ 
        projects, 
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Successfully loaded ${projects.length} projects`,
        successTimestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data: projects
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
      const storeError = createError('api', errorMessage, {
        endpoint: '/projects',
        method: 'GET'
      });
      
      console.error(`❌ ProjectStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
      console.error('ProjectStore Error:', error);
      
      set({ 
        error: storeError,
        errorTimestamp: new Date().toISOString(),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined
      });
      
      return {
        success: false,
        error: storeError
      };
    }
  },
  
  addProject: async (project) => {
    const startTime = performance.now();
    const action = 'addProject';
    
    console.log(`➕ ProjectStore: Starting ${action} for project: ${project.name}`);
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const endTime = performance.now();
      
      console.log(`✅ ProjectStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      set((state) => ({ 
        projects: [project, ...state.projects],
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project "${project.name}" added successfully`,
        successTimestamp: new Date().toISOString()
      }));
      
      return {
        success: true,
        data: project
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : 'Failed to add project';
      const storeError = createError('api', errorMessage, {
        endpoint: '/projects',
        method: 'POST'
      });
      
      console.error(`❌ ProjectStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
      console.error('ProjectStore Error:', error);
      
      set({ 
        error: storeError,
        errorTimestamp: new Date().toISOString(),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined
      });
      
      return {
        success: false,
        error: storeError
      };
    }
  },
  
  updateProject: async (projectId, updates) => {
    const startTime = performance.now();
    const action = 'updateProject';
    
    console.log(`✏️ ProjectStore: Starting ${action} for project: ${projectId}`);
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const endTime = performance.now();
      
      console.log(`✅ ProjectStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      set((state) => {
        const updatedProjects = state.projects.map(p => 
          p.id === projectId ? { ...p, ...updates } : p
        );
        
        return {
          projects: updatedProjects,
          isLoading: false,
          loadingAction: undefined,
          loadingStartTime: undefined,
          lastSuccess: `Project updated successfully`,
          successTimestamp: new Date().toISOString()
        };
      });
      
      const updatedProject = get().projects.find(p => p.id === projectId);
      
      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      const storeError = createError('api', errorMessage, {
        endpoint: `/projects/${projectId}`,
        method: 'PUT'
      });
      
      console.error(`❌ ProjectStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
      console.error('ProjectStore Error:', error);
      
      set({ 
        error: storeError,
        errorTimestamp: new Date().toISOString(),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined
      });
      
      return {
        success: false,
        error: storeError
      };
    }
  },
  
  deleteProject: async (projectId) => {
    const startTime = performance.now();
    const action = 'deleteProject';
    
    console.log(`🗑️ ProjectStore: Starting ${action} for project: ${projectId}`);
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const endTime = performance.now();
      
      console.log(`✅ ProjectStore: ${action} completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project deleted successfully`,
        successTimestamp: new Date().toISOString()
      }));
      
      return {
        success: true
      };
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
      const storeError = createError('api', errorMessage, {
        endpoint: `/projects/${projectId}`,
        method: 'DELETE'
      });
      
      console.error(`❌ ProjectStore: ${action} failed after ${(endTime - startTime).toFixed(2)}ms`);
      console.error('ProjectStore Error:', error);
      
      set({ 
        error: storeError,
        errorTimestamp: new Date().toISOString(),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined
      });
      
      return {
        success: false,
        error: storeError
      };
    }
  },
  
  clearError: () => {
    console.log('🧹 ProjectStore: Clearing error state');
    set({ 
      error: null,
      errorTimestamp: undefined
    });
  },
  
  setLoading: (loading, action) => {
    console.log(`⏳ ProjectStore: Setting loading state to ${loading}${action ? ` for ${action}` : ''}`);
    set({ 
      isLoading: loading,
      loadingAction: action,
      loadingStartTime: loading ? performance.now() : undefined
    });
  },
  
  clearSuccess: () => {
    console.log('🧹 ProjectStore: Clearing success state');
    set({ 
      lastSuccess: undefined,
      successTimestamp: undefined
    });
  },
})); 