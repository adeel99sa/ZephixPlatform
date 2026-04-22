import { Navigate, Outlet } from "react-router-dom";
import { useProgramsPortfoliosEnabled } from "@/lib/features";

export default function FeaturesRoute(props: { feature: "programsPortfolios" }) {
  const enabled = useProgramsPortfoliosEnabled();
  if (props.feature === "programsPortfolios" && !enabled) {
    // Phase 4.7: bypass retired /home; inbox is the canonical landing.
    return <Navigate to="/inbox" replace />;
  }
  return <Outlet />;
}
