import { useUIStore, selectIsSidebarOpen, selectOpenSidebar, selectCloseSidebar } from '@/stores/uiStore';
import { useCallback } from 'react';

/**
 * Custom hook for sidebar state management
 * Provides a clean interface for sidebar operations
 */
export const useSidebar = () => {
  const isOpen = useUIStore(selectIsSidebarOpen);
  const open   = useUIStore(selectOpenSidebar);
  const close  = useUIStore(selectCloseSidebar);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);

  const handleToggle = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleOpen = useCallback(() => {
    open(true);
  }, [open]);

  const handleClose = useCallback(() => {
    close(false);
  }, [close]);

  return {
    isOpen,
    toggle: handleToggle,
    open: handleOpen,
    close: handleClose,
  };
};

