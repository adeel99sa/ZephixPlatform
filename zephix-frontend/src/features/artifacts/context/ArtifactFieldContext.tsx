import { createContext, useContext } from 'react';

import type { AssigneeOption } from '@/features/projects/components/AssigneePicker';

export type ArtifactFieldContextValue = {
  assigneeOptions: AssigneeOption[];
  currentUserId?: string | null;
};

const ArtifactFieldContext = createContext<ArtifactFieldContextValue | null>(null);

export function ArtifactFieldProvider({
  value,
  children,
}: {
  value: ArtifactFieldContextValue;
  children: React.ReactNode;
}) {
  return (
    <ArtifactFieldContext.Provider value={value}>{children}</ArtifactFieldContext.Provider>
  );
}

export function useArtifactFieldContext(): ArtifactFieldContextValue {
  const ctx = useContext(ArtifactFieldContext);
  return ctx ?? { assigneeOptions: [], currentUserId: null };
}
