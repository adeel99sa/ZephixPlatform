import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiGet, apiPost, apiPut, apiDelete } from '../services/api.service';

interface Project {
  id: string;
  name: string;
  description?: string;
  template?: string;
  methodology?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  department?: string;
  stakeholders?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<boolean>;
  getProjectById: (id: string) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      projects: [],
      isLoading: false,
      error: null,

      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const projects = await apiGet('projects');
          set({ projects, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch projects:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch projects',
            isLoading: false 
          });
        }
      },

      createProject: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const newProject = await apiPost('projects', data);
          const projects = [...get().projects, newProject];
          set({ projects, isLoading: false });
          return true;
        } catch (error) {
          console.error('Failed to create project:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create project',
            isLoading: false 
          });
          return false;
        }
      },

      getProjectById: async (id: string) => {
        try {
          // First try to find in existing projects
          const existingProject = get().projects.find(p => p.id === id);
          if (existingProject) {
            return existingProject;
          }
          
          // If not found, fetch from API
          const project = await apiGet(`projects/${id}`);
          return project;
        } catch (error) {
          console.error('Failed to get project:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to get project'
          });
          return null;
        }
      },

      updateProject: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedProject = await apiPut(`projects/${id}`, data);
          const projects = get().projects.map(p => 
            p.id === id ? updatedProject : p
          );
          set({ projects, isLoading: false });
          return true;
        } catch (error) {
          console.error('Failed to update project:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update project',
            isLoading: false 
          });
          return false;
        }
      },

      deleteProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await apiDelete(`projects/${id}`);
          const projects = get().projects.filter(p => p.id !== id);
          set({ projects, isLoading: false });
          return true;
        } catch (error) {
          console.error('Failed to delete project:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete project',
            isLoading: false 
          });
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'project-store',
    }
  )
);
