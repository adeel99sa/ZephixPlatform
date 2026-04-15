import { Navigate } from "react-router-dom";

/** Legacy route — organization profile moved under General (design lock v2). */
export default function AdministrationOrganizationPage() {
  return <Navigate to="/administration/general" replace />;
}
