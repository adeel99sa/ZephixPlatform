import { useAuth } from "@/state/AuthContext";

/**
 * Programs/Portfolios feature gate.
 * SESSION-FRONTEND-1 Item 3: flipped on for surface recon (was hardcoded false).
 * Org-level flag wiring remains a follow-up.
 */
export function useProgramsPortfoliosEnabled(): boolean {
  const { user } = useAuth();
  return Boolean(user);
}
