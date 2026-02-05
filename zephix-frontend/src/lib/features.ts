import { useAuth } from "@/state/AuthContext";

/**
 * Hook to check if Programs/Portfolios feature is enabled
 * Currently defaults to false (hidden for MVP) - will be configurable via org settings later
 * TODO: Wire up to organization-level feature flags when that's implemented
 */
export function useProgramsPortfoliosEnabled(): boolean {
  const { user } = useAuth();
  // For now, return false by default - feature not yet enabled for any org
  // When org-level features are implemented, check: user?.organization?.features?.enableProgramsPortfolios
  return user ? false : false;
}
