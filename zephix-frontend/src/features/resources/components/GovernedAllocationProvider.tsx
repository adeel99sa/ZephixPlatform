import React from 'react';
import { ResourceJustificationModal } from './ResourceJustificationModal';
import { useGovernedAllocationMutation } from '../hooks/useGovernedAllocationMutation';
import type { UseGovernedAllocationMutationOptions } from '../hooks/useGovernedAllocationMutation';

/**
 * Provider component that wraps allocation mutations with justification handling
 *
 * Usage:
 * ```tsx
 * <GovernedAllocationProvider resourceName="John Doe">
 *   <YourComponent />
 * </GovernedAllocationProvider>
 * ```
 *
 * Then in YourComponent, use the hook:
 * ```tsx
 * const { createAllocation, justificationModalProps, handleJustificationSubmit, handleJustificationCancel } = useGovernedAllocationMutation();
 * ```
 */
export interface GovernedAllocationProviderProps {
  children: React.ReactNode;
  options?: UseGovernedAllocationMutationOptions;
}

export const GovernedAllocationProvider: React.FC<GovernedAllocationProviderProps> = ({
  children,
  options = {},
}) => {
  const {
    isJustificationModalOpen,
    justificationModalProps,
    handleJustificationSubmit,
    handleJustificationCancel,
  } = useGovernedAllocationMutation(options);

  return (
    <>
      {children}
      <ResourceJustificationModal
        {...justificationModalProps}
        onSubmit={handleJustificationSubmit}
        onCancel={handleJustificationCancel}
      />
    </>
  );
};





