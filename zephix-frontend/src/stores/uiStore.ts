// uiStore.ts - UI state management for Zephix Platform
import { create } from 'zustand';

// Enhanced TypeScript interfaces for better type safety
interface UIState {
  // Modal states
  blueprintModalProjectId: string | null;
  
  // Actions
  openBlueprintModal: (projectId: string) => void;
  closeBlueprintModal: () => void;
  clearModalState: () => void;
}

// Type for store actions
type UIActions = {
  openBlueprintModal: (projectId: string) => void;
  closeBlueprintModal: () => void;
  clearModalState: () => void;
};

// Type for store state
type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  blueprintModalProjectId: null,
  
  // Actions with performance monitoring
  openBlueprintModal: (projectId) => {
    console.log(`🔍 UIStore: Opening blueprint modal for project: ${projectId}`);
    const startTime = performance.now();
    
    set({ blueprintModalProjectId: projectId });
    
    const endTime = performance.now();
    console.log(`✅ UIStore: Modal opened in ${(endTime - startTime).toFixed(2)}ms`);
  },
  
  closeBlueprintModal: () => {
    console.log('❌ UIStore: Closing blueprint modal');
    const startTime = performance.now();
    
    set({ blueprintModalProjectId: null });
    
    const endTime = performance.now();
    console.log(`✅ UIStore: Modal closed in ${(endTime - startTime).toFixed(2)}ms`);
  },
  
  clearModalState: () => {
    console.log('🧹 UIStore: Clearing all modal state');
    set({ blueprintModalProjectId: null });
  },
}));
