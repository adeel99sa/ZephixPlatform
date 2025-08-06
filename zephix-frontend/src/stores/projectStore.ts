import { create } from 'zustand';
import { projectsApi } from '../services/api';
import type { Project, CreateProjectData } from '../types';
import { toast } from 'sonner';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTotalCount: (count: number) => void;
  
  // API Actions
  fetchProjects: () => Promise<void>;
  fetchProjectById: (id: string) => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<Project | null>;
  updateProjectById: (id: string, data: Partial<CreateProjectData>) => Promise<Project | null>;
  deleteProjectById: (id: string) => Promise<boolean>;
  
  // Team Management
  addTeamMember: (projectId: string, memberData: { userId: string; roleId: string }) => Promise<void>;
  updateTeamMember: (projectId: string, memberId: string, memberData: { roleId: string }) => Promise<void>;
  removeTeamMember: (projectId: string, memberId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  
  // Basic state setters
  setProjects: (projects) => set({ projects, error: null }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      currentProject: state.currentProject?.id === id 
        ? { ...state.currentProject, ...updates }
        : state.currentProject,
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setTotalCount: (count) => set({ totalCount: count }),
  
  // API Actions
  fetchProjects: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectsApi.getAll();
      set({ 
        projects: response.projects, 
        totalCount: response.count,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: 'Failed to load projects', 
        isLoading: false 
      });
      console.error('Failed to fetch projects:', error);
    }
  },
  
  fetchProjectById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectsApi.getById(id);
      set({ 
        currentProject: response.project, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: 'Failed to load project', 
        isLoading: false 
      });
      console.error('Failed to fetch project:', error);
    }
  },
  
  createProject: async (data: CreateProjectData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectsApi.create(data);
      const newProject = response.project;
      
      // Add to projects list
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }));
      
      toast.success('Project created successfully!');
      return newProject;
    } catch (error) {
      set({ 
        error: 'Failed to create project', 
        isLoading: false 
      });
      console.error('Failed to create project:', error);
      return null;
    }
  },
  
  updateProjectById: async (id: string, data: Partial<CreateProjectData>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectsApi.update(id, data);
      const updatedProject = response.project;
      
      // Update in projects list and current project
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? updatedProject : p
        ),
        currentProject: state.currentProject?.id === id 
          ? updatedProject 
          : state.currentProject,
        isLoading: false,
      }));
      
      toast.success('Project updated successfully!');
      return updatedProject;
    } catch (error) {
      set({ 
        error: 'Failed to update project', 
        isLoading: false 
      });
      console.error('Failed to update project:', error);
      return null;
    }
  },
  
  deleteProjectById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await projectsApi.delete(id);
      
      // Remove from projects list and current project
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
      }));
      
      toast.success('Project deleted successfully!');
      return true;
    } catch (error) {
      set({ 
        error: 'Failed to delete project', 
        isLoading: false 
      });
      console.error('Failed to delete project:', error);
      return false;
    }
  },
  
  // Team Management Actions
  addTeamMember: async (projectId: string, memberData: { userId: string; roleId: string }) => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectsApi.addTeamMember(projectId, memberData);
      
      // Update current project if it's the one being modified
      set((state) => ({
        currentProject: state.currentProject?.id === projectId 
          ? { ...state.currentProject, team: { ...state.currentProject.team, members: [...(state.currentProject.team?.members || []), response.teamMember] } }
          : state.currentProject,
        isLoading: false,
      }));
      
      toast.success('Team member added successfully!');
    } catch (error) {
      set({ 
        error: 'Failed to add team member', 
        isLoading: false 
      });
      console.error('Failed to add team member:', error);
    }
  },
  
  updateTeamMember: async (projectId: string, memberId: string, memberData: { roleId: string }) => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectsApi.updateTeamMember(projectId, memberId, memberData);
      
      // Update current project if it's the one being modified
      set((state) => ({
        currentProject: state.currentProject?.id === projectId 
          ? { 
              ...state.currentProject, 
              team: { 
                ...state.currentProject.team, 
                members: state.currentProject.team?.members?.map(m => 
                  m.id === memberId ? response.teamMember : m
                ) || []
              } 
            }
          : state.currentProject,
        isLoading: false,
      }));
      
      toast.success('Team member updated successfully!');
    } catch (error) {
      set({ 
        error: 'Failed to update team member', 
        isLoading: false 
      });
      console.error('Failed to update team member:', error);
    }
  },
  
  removeTeamMember: async (projectId: string, memberId: string) => {
    try {
      set({ isLoading: true, error: null });
      await projectsApi.removeTeamMember(projectId, memberId);
      
      // Update current project if it's the one being modified
      set((state) => ({
        currentProject: state.currentProject?.id === projectId 
          ? { 
              ...state.currentProject, 
              team: { 
                ...state.currentProject.team, 
                members: state.currentProject.team?.members?.filter(m => m.id !== memberId) || []
              } 
            }
          : state.currentProject,
        isLoading: false,
      }));
      
      toast.success('Team member removed successfully!');
    } catch (error) {
      set({ 
        error: 'Failed to remove team member', 
        isLoading: false 
      });
      console.error('Failed to remove team member:', error);
    }
  },
})); 