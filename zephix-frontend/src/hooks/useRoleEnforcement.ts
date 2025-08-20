import { useContext } from 'react';
import { RolePolicy, Permission } from '../utils/rolePolicy';

// Mock auth context for development - replace with real auth context
const useMockAuth = () => ({
  user: { role: 'admin' as 'admin' | 'member' | 'viewer' }
});

export const useRoleEnforcement = () => {
  // TODO: Replace with real AuthContext
  const { user } = useMockAuth();
  
  return {
    hasPermission: (permission: Permission) => 
      RolePolicy.hasPermission(user.role, permission),
    
    canAccessRoute: (route: string) => 
      RolePolicy.canAccessRoute(user.role, route),
    
    uiState: RolePolicy.getUIState(user.role),
    
    enforceRoute: (route: string) => {
      if (!RolePolicy.canAccessRoute(user.role, route)) {
        throw new Error(`Access denied to ${route} for role ${user.role}`);
      }
    }
  };
};

