import { Navigate, Outlet } from "react-router-dom";
import { useProgramsPortfoliosEnabled } from "@/lib/features";

export default function FeaturesRoute(props: { feature: "programsPortfolios" }) {
  const enabled = useProgramsPortfoliosEnabled();
  if (props.feature === "programsPortfolios" && !enabled) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
