import { useState, useCallback } from 'react';

interface UndoAction {
  id: string;
  message: string;
  onUndo: () => Promise<void>;
  onAutoDismiss?: () => void;
  timestamp: number;
}

export const useUndoBanner = () => {
  const [currentAction, setCurrentAction] = useState<UndoAction | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showUndoBanner = useCallback((
    message: string,
    onUndo: () => Promise<void>,
    duration: number = 10000,
    onAutoDismiss?: () => void
  ) => {
    const action: UndoAction = {
      id: `undo-${Date.now()}`,
      message,
      onUndo,
      onAutoDismiss,
      timestamp: Date.now()
    };

    setCurrentAction(action);
    setIsVisible(true);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        if (action.onAutoDismiss) {
          action.onAutoDismiss();
        }
        setIsVisible(false);
        setCurrentAction(null);
      }, duration);
    }
  }, []);

  const handleUndo = useCallback(async () => {
    if (currentAction) {
      try {
        await currentAction.onUndo();
        setIsVisible(false);
        setCurrentAction(null);
      } catch (error) {
        console.error('Failed to undo action:', error);
        // Keep banner visible on error so user can try again
      }
    }
  }, [currentAction]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setCurrentAction(null);
  }, []);

  return {
    isVisible,
    message: currentAction?.message || '',
    showUndoBanner,
    handleUndo,
    handleDismiss
  };
};

export default useUndoBanner;

