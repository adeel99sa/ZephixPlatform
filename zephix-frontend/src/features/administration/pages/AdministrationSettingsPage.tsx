// DEPRECATED: Split into SecurityPage (with permissions tabs), OrganizationPage (MVP-5)
import { Navigate } from "react-router-dom";
export default function AdministrationSettingsPage() {
  return <Navigate to="/administration/security" replace />;
}
