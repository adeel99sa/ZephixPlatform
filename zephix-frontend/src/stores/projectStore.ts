import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '../services/api';
import type { Project } from '../types';
import type { BaseStoreState, AsyncResult } from '../types/store';
import { createError } from '../types/store';

interface ProjectState extends BaseStoreState {
  projects: Project[];
  totalProjects: number;
  currentPage: number;
  pageSize: number;
  
  // Actions
  fetchProjects: (page?: number) => Promise<AsyncResult<Project[]>>;
  createProject: (data: Partial<Project>) => Promise<AsyncResult<Project>>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<AsyncResult<Project>>;
  deleteProject: (projectId: string) => Promise<AsyncResult<void>>;
  clearError: () => void;
  setLoading: (loading: boolean, action?: string) => void;
  clearSuccess: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  totalProjects: 0,
  currentPage: 1,
  pageSize: 20,
  isLoading: false,
  loadingAction: undefined,
  loadingStartTime: undefined,
  error: null,
  errorTimestamp: undefined,
  lastSuccess: undefined,
  successTimestamp: undefined,
  
  fetchProjects: async (page = 1) => {
    const startTime = performance.now();
    const action = 'fetchProjects';
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      const response = await apiGet(`/projects?page=${page}&limit=${get().pageSize}`);
      const endTime = performance.now();
      
      // Handle both paginated and non-paginated responses
      const projects = response.data || response;
      const total = response.total || projects.length;
      
      set({ 
        projects: Array.isArray(projects) ? projects : [],
        totalProjects: total,
        currentPage: page,
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
      const storeError = createError('api', errorMessage, {
        endpoint: '/projects',
        method: 'GET'
      });
      
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
  
  createProject: async (data) => {
    const startTime = performance.now();
    const action = 'createProject';
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      const response = await apiPost('/projects', data);
      const project = response;
      
      set((state) => ({ 
        projects: [project, ...state.projects].slice(0, state.pageSize),
        totalProjects: state.totalProjects + 1,
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project "${project.name}" created successfully`,
        successTimestamp: new Date().toISOString()
      }));
      
      return {
        success: true,
        data: project
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      const storeError = createError('api', errorMessage, {
        endpoint: '/projects',
        method: 'POST'
      });
      
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
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      const response = await apiPut(`/projects/${projectId}`, updates);
      const updatedProject = response;
      
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? updatedProject : p
        ),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project updated successfully`,
        successTimestamp: new Date().toISOString()
      }));
      
      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      const storeError = createError('api', errorMessage, {
        endpoint: `/projects/${projectId}`,
        method: 'PUT'
      });
      
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
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      await apiDelete(`/projects/${projectId}`);
      
      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        totalProjects: state.totalProjects - 1,
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
      const storeError = createError('api', errorMessage, {
        endpoint: `/projects/${projectId}`,
        method: 'DELETE'
      });
      
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
    set({ 
      error: null,
      errorTimestamp: undefined
    });
  },
  
  setLoading: (loading, action) => {
    set({ 
      isLoading: loading,
      loadingAction: action,
      loadingStartTime: loading ? performance.now() : undefined
    });
  },
  
  clearSuccess: () => {
    set({ 
      lastSuccess: undefined,
      successTimestamp: undefined
    });
  },
}));
