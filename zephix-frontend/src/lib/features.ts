import { useAuth } from "@/state/AuthContext";

/**
 * Hook to check if Programs/Portfolios feature is enabled
 * Reads from user.organization.features.enableProgramsPortfolios
 * Defaults to false if not set (hidden by default for MVP)
 */
export function useProgramsPortfoliosEnabled(): boolean {
  const { user } = useAuth();
  return !!user?.organization?.features?.enableProgramsPortfolios;
}
