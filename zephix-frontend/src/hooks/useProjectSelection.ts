import { useUIStore } from '../stores/uiStore';
import { useCallback } from 'react';
import type { Project } from '../types';

/**
 * Custom hook for project selection state management
 * Provides a clean interface for project selection operations
 */
export const useProjectSelection = () => {
  const { 
    selectedProject, 
    selectProject, 
    clearSelectedProject 
  } = useUIStore();

  const handleSelect = useCallback((project: Project | null) => {
    selectProject(project);
  }, [selectProject]);

  const handleClear = useCallback(() => {
    clearSelectedProject();
  }, [clearSelectedProject]);

  const isSelected = useCallback((projectId: string) => {
    return selectedProject?.id === projectId;
  }, [selectedProject]);

  return {
    selectedProject,
    select: handleSelect,
    clear: handleClear,
    isSelected,
  };
};

