import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt?: string;
}

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
  loading: boolean;
  
  setCurrentWorkspace: (workspace: Workspace) => void;
  loadWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspaceName: (id: string, name: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      currentWorkspace: null,
      availableWorkspaces: [],
      loading: false,

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace });
        // Store in localStorage for persistence
        localStorage.setItem('currentWorkspaceId', workspace.id);
      },

      loadWorkspaces: async () => {
        set({ loading: true });
        try {
          const response = await api.get('/workspaces/my-workspaces');
          const workspaces = response.data.data || response.data;
          
          set({ availableWorkspaces: workspaces });
          
          // Auto-select first workspace if none selected
          const currentId = localStorage.getItem('currentWorkspaceId');
          const current = workspaces.find((w: Workspace) => w.id === currentId);
          
          if (current) {
            set({ currentWorkspace: current });
          } else if (workspaces.length > 0) {
            set({ currentWorkspace: workspaces[0] });
            localStorage.setItem('currentWorkspaceId', workspaces[0].id);
          } else {
            // No workspaces available - create a default one
            console.warn('No workspaces found, creating default workspace');
            try {
              const defaultWorkspace = await get().createWorkspace('My Workspace');
              set({ currentWorkspace: defaultWorkspace });
            } catch (createError) {
              console.error('Failed to create default workspace:', createError);
            }
          }
        } catch (error) {
          console.error('Failed to load workspaces:', error);
        } finally {
          set({ loading: false });
        }
      },

      switchWorkspace: async (workspaceId) => {
        const workspace = get().availableWorkspaces.find(w => w.id === workspaceId);
        if (workspace) {
          get().setCurrentWorkspace(workspace);
          
          // Clear any cached data
          localStorage.setItem('currentWorkspaceId', workspaceId);
          
          // Emit event for components to refresh
          window.dispatchEvent(new CustomEvent('workspace-changed', { 
            detail: { workspaceId, workspace } 
          }));
          
          // Trigger a soft refresh of data without page reload
          // Components should listen to the workspace-changed event
        }
      },

      createWorkspace: async (name) => {
        const response = await api.post('/workspaces', { name });
        const newWorkspace = response.data.data || response.data;
        
        set((state) => ({
          availableWorkspaces: [...state.availableWorkspaces, newWorkspace]
        }));
        
        return newWorkspace;
      },

      updateWorkspaceName: async (id, name) => {
        await api.patch(`/workspaces/${id}`, { name });
        
        set((state) => ({
          availableWorkspaces: state.availableWorkspaces.map(w => 
            w.id === id ? { ...w, name } : w
          ),
          currentWorkspace: state.currentWorkspace?.id === id 
            ? { ...state.currentWorkspace, name }
            : state.currentWorkspace
        }));
      }
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ 
        currentWorkspaceId: state.currentWorkspace?.id 
      })
    }
  )
);
