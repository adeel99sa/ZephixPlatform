import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  
  // Theme state
  theme: 'light' | 'dark' | 'system';
  
  // Workspace state
  workspaceId: string;
  
  // Toast notifications
  toastQueue: Toast[];
  
  // Loading states
  globalLoading: boolean;
  
  // Modal states
  activeModal: string | null;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  setWorkspaceId: (id: string) => void;
  
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  setGlobalLoading: (loading: boolean) => void;
  
  setActiveModal: (modalId: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      theme: 'system',
      workspaceId: 'ws-1',
      toastQueue: [],
      globalLoading: false,
      activeModal: null,

      // Actions
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });
        
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      setWorkspaceId: (id: string) => {
        set({ workspaceId: id });
      },

      addToast: (toast: Omit<Toast, 'id'>) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = {
          id,
          duration: 5000,
          ...toast,
        };

        set((state) => ({
          toastQueue: [...state.toastQueue, newToast],
        }));

        // Auto-remove toast after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, newToast.duration);
        }
      },

      removeToast: (id: string) => {
        set((state) => ({
          toastQueue: state.toastQueue.filter((toast) => toast.id !== id),
        }));
      },

      clearToasts: () => {
        set({ toastQueue: [] });
      },

      setGlobalLoading: (loading: boolean) => {
        set({ globalLoading: loading });
      },

      setActiveModal: (modalId: string | null) => {
        set({ activeModal: modalId });
      },
    }),
    {
      name: 'zephix-ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        workspaceId: state.workspaceId,
      }),
    }
  )
);

// 🔧 Compat selectors (shim names some components expect):
export const selectIsSidebarOpen = (s: UIState) => s.sidebarOpen;
export const selectOpenSidebar   = (s: UIState) => s.setSidebarOpen;
export const selectCloseSidebar  = (s: UIState) => s.setSidebarOpen;