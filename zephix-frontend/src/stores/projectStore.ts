import { create } from 'zustand';

import { request } from '@/lib/api';
import type { Project } from '../types';
import type { BaseStoreState, AsyncResult } from '../types/store';
import { createError } from '../types/store';

// Projects API inline replacement - use request for unwrapped responses
const projectsApi = {
  getAll: () => request.get<{ data: Project[]; total: number } | Project[]>('/projects'),
  create: (data: Partial<Project>) => request.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => request.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => request.delete(`/projects/${id}`),
};

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

interface ProjectCache {
  data: Project[];
  timestamp: number;
  total: number;
}

interface ProjectState extends BaseStoreState {
  projects: Project[];
  totalProjects: number;
  currentPage: number;
  pageSize: number;
  cache: ProjectCache | null;
  retryCount: Map<string, number>;
  
  // Actions
  fetchProjects: (force?: boolean) => Promise<AsyncResult<Project[]>>;
  createProject: (data: Partial<Project>) => Promise<AsyncResult<Project>>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<AsyncResult<Project>>;
  deleteProject: (projectId: string) => Promise<AsyncResult<void>>;
  clearError: () => void;
  setLoading: (loading: boolean, action?: string) => void;
  clearSuccess: () => void;
  clearCache: () => void;
}

// Helper function for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API calls with retry
async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  retryCount: number = 0
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      await wait(RETRY_DELAY * Math.pow(2, retryCount));
      return callWithRetry(apiCall, retryCount + 1);
    }
    throw error;
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  totalProjects: 0,
  currentPage: 1,
  pageSize: 20,
  cache: null,
  retryCount: new Map(),
  isLoading: false,
  loadingAction: undefined,
  loadingStartTime: undefined,
  error: null,
  errorTimestamp: undefined,
  lastSuccess: undefined,
  successTimestamp: undefined,
  
  fetchProjects: async (force = false) => {
    const state = get();
    
    // Use cache if valid and not forcing refresh
    if (!force && state.cache && Date.now() - state.cache.timestamp < CACHE_TTL) {
      return {
        success: true,
        data: state.cache.data
      };
    }
    
    const startTime = performance.now();
    const action = 'fetchProjects';
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      const response = await callWithRetry(() => projectsApi.getAll());
      
      // Handle both paginated and non-paginated responses
      // Type guard to check if response is paginated
      const isPaginated = (r: unknown): r is { data: Project[]; total: number } => 
        r !== null && typeof r === 'object' && 'data' in r && 'total' in r;
      
      const projects = isPaginated(response) ? response.data : response;
      const projectsArray = Array.isArray(projects) ? projects : [];
      const total = isPaginated(response) ? response.total : projectsArray.length;
      
      // Update cache
      const cache: ProjectCache = {
        data: projectsArray,
        timestamp: Date.now(),
        total
      };
      
      set({ 
        projects: projectsArray,
        totalProjects: total,
        cache,
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Successfully loaded ${projectsArray.length} projects`,
        successTimestamp: new Date().toISOString(),
        retryCount: new Map() // Reset retry count on success
      });
      
      return {
        success: true,
        data: projectsArray
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
      
      // Return cached data if available during error
      if (state.cache) {
        return {
          success: false,
          error: storeError,
          data: state.cache.data
        };
      }
      
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
      const project = await callWithRetry(() => projectsApi.create(data));
      
      // Optimistically update UI
      set((state) => ({ 
        projects: [project, ...state.projects].slice(0, state.pageSize),
        totalProjects: state.totalProjects + 1,
        cache: null, // Invalidate cache
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project "${project.name}" created successfully`,
        successTimestamp: new Date().toISOString(),
        retryCount: new Map()
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
    
    // Store original state for rollback
    const originalProjects = get().projects;
    
    // Optimistic update
    set((state) => ({
      projects: state.projects.map(p => 
        p.id === projectId ? { ...p, ...updates } : p
      ),
      cache: null // Invalidate cache
    }));
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      const updatedProject = await callWithRetry(() => 
        projectsApi.update(projectId, updates)
      );
      
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? updatedProject : p
        ),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project updated successfully`,
        successTimestamp: new Date().toISOString(),
        retryCount: new Map()
      }));
      
      return {
        success: true,
        data: updatedProject
      };
    } catch (error) {
      // Rollback optimistic update
      set({ 
        projects: originalProjects,
        error: createError('api', error instanceof Error ? error.message : 'Failed to update', {
          endpoint: `/projects/${projectId}`,
          method: 'PUT'
        }),
        errorTimestamp: new Date().toISOString(),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined
      });
      
      return {
        success: false,
        error: get().error!
      };
    }
  },
  
  deleteProject: async (projectId) => {
    const startTime = performance.now();
    const action = 'deleteProject';
    
    // Store original state for rollback
    const originalProjects = get().projects;
    const originalTotal = get().totalProjects;
    
    // Optimistic delete
    set((state) => ({
      projects: state.projects.filter(p => p.id !== projectId),
      totalProjects: state.totalProjects - 1,
      cache: null
    }));
    
    set({ 
      isLoading: true, 
      loadingAction: action,
      loadingStartTime: startTime,
      error: null 
    });
    
    try {
      // Assume delete exists or handle gracefully
      if (projectsApi.delete) {
        await callWithRetry(() => projectsApi.delete(projectId));
      }
      
      set({
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined,
        lastSuccess: `Project deleted successfully`,
        successTimestamp: new Date().toISOString(),
        retryCount: new Map()
      });
      
      return {
        success: true
      };
    } catch (error) {
      // Rollback
      set({ 
        projects: originalProjects,
        totalProjects: originalTotal,
        error: createError('api', error instanceof Error ? error.message : 'Failed to delete', {
          endpoint: `/projects/${projectId}`,
          method: 'DELETE'
        }),
        errorTimestamp: new Date().toISOString(),
        isLoading: false,
        loadingAction: undefined,
        loadingStartTime: undefined
      });
      
      return {
        success: false,
        error: get().error!
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
  
  clearCache: () => {
    set({ cache: null });
  }
}));
