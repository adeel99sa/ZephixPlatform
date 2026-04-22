import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type WorkSurfaceUiContextValue = {
  customizeViewOpen: boolean;
  setCustomizeViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  gearRef: React.RefObject<HTMLButtonElement | null>;
};

const WorkSurfaceUiContext = createContext<WorkSurfaceUiContextValue | null>(null);

export function WorkSurfaceUiProvider({ children }: { children: React.ReactNode }) {
  const [customizeViewOpen, setCustomizeViewOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);

  const value = useMemo(
    () => ({
      customizeViewOpen,
      setCustomizeViewOpen,
      gearRef,
    }),
    [customizeViewOpen],
  );

  return <WorkSurfaceUiContext.Provider value={value}>{children}</WorkSurfaceUiContext.Provider>;
}

export function useWorkSurfaceUi(): WorkSurfaceUiContextValue {
  const ctx = useContext(WorkSurfaceUiContext);
  if (!ctx) {
    throw new Error('useWorkSurfaceUi must be used within WorkSurfaceUiProvider');
  }
  return ctx;
}

/** Safe for routes that omit the provider (should not happen on project work tabs). */
export function useWorkSurfaceUiOptional(): WorkSurfaceUiContextValue | null {
  return useContext(WorkSurfaceUiContext);
}

export function useCloseCustomizeView(): () => void {
  const ctx = useContext(WorkSurfaceUiContext);
  return useCallback(() => {
    ctx?.setCustomizeViewOpen(false);
  }, [ctx]);
}
