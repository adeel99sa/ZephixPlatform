import { create } from 'zustand';
import { mockApi } from './mockApi';
import type { Project } from '../types';

// Enhanced TypeScript interfaces for better type safety
interface ProjectState {
  // State properties
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  addProject: (project: Project) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// Type for store actions
type ProjectActions = {
  fetchProjects: () => Promise<void>;
  addProject: (project: Project) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
};

// Type for store state
type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: [],
  isLoading: false,
  error: null,
  
  // Actions with enhanced error handling and performance monitoring
  fetchProjects: async () => {
    console.log('🔄 ProjectStore: Starting fetchProjects...');
    const startTime = performance.now();
    
    set({ isLoading: true, error: null });
    
    try {
      const projects = await mockApi.getProjects();
      const endTime = performance.now();
      
      console.log(`✅ ProjectStore: fetchProjects completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 ProjectStore: Loaded ${projects.length} projects`);
      
      set({ projects, isLoading: false });
    } catch (error) {
      const endTime = performance.now();
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
      
      console.error(`❌ ProjectStore: fetchProjects failed after ${(endTime - startTime).toFixed(2)}ms`);
      console.error('ProjectStore Error:', error);
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
    }
  },
  
  addProject: (project) => {
    console.log('➕ ProjectStore: Adding new project:', project.name);
    set((state) => ({ 
      projects: [project, ...state.projects],
      error: null // Clear any previous errors
    }));
    console.log(`✅ ProjectStore: Project "${project.name}" added successfully`);
  },
  
  clearError: () => {
    console.log('🧹 ProjectStore: Clearing error state');
    set({ error: null });
  },
  
  setLoading: (loading) => {
    console.log(`⏳ ProjectStore: Setting loading state to ${loading}`);
    set({ isLoading: loading });
  },
})); 