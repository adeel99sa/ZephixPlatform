import { useUIStore } from '../stores/uiStore';
import { useCallback } from 'react';

/**
 * Custom hook for sidebar state management
 * Provides a clean interface for sidebar operations
 */
export const useSidebar = () => {
  const { 
    isSidebarOpen, 
    toggleSidebar, 
    openSidebar, 
    closeSidebar 
  } = useUIStore();

  const handleToggle = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleOpen = useCallback(() => {
    openSidebar();
  }, [openSidebar]);

  const handleClose = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  return {
    isOpen: isSidebarOpen,
    toggle: handleToggle,
    open: handleOpen,
    close: handleClose,
  };
};

