import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { AccountSettings } from "./components/AccountSettings";
import { WorkspaceSettings } from "./components/WorkspaceSettings";
import { OrganizationSettings } from "./components/OrganizationSettings";
import BillingPage from "../billing/BillingPage";

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"account"|"workspace"|"organization"|"billing"|"notifications"|"security">("account");

  // Sync tab with current route
  useEffect(() => {
    if (location.pathname === "/settings/notifications") {
      setTab("notifications");
    } else if (location.pathname === "/settings/security") {
      setTab("security");
    } else if (location.pathname === "/settings") {
      setTab("account");
    }
  }, [location.pathname]);

  const handleTabClick = (newTab: typeof tab) => {
    setTab(newTab);
    if (newTab === "notifications") {
      navigate("/settings/notifications");
    } else if (newTab === "security") {
      navigate("/settings/security");
    } else if (newTab === "account") {
      navigate("/settings");
    }
  };

  // Check if we're on a nested route (notifications or security)
  const isNestedRoute = location.pathname === "/settings/notifications" || location.pathname === "/settings/security";

  return (
    <div data-testid="settings-root" className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex gap-2">
        <button data-testid="settings-tab-account" onClick={()=>handleTabClick("account")} className={tab==="account"?"btn-primary":"btn"}>Account</button>
        <button data-testid="settings-tab-workspace" onClick={()=>setTab("workspace")} className={tab==="workspace"?"btn-primary":"btn"}>Workspace</button>
        <button data-testid="settings-tab-organization" onClick={()=>setTab("organization")} className={tab==="organization"?"btn-primary":"btn"}>Organization</button>
        <button data-testid="settings-tab-billing" onClick={()=>setTab("billing")} className={tab==="billing"?"btn-primary":"btn"}>Billing & Plans</button>
        <button data-testid="settings-tab-notifications" onClick={()=>handleTabClick("notifications")} className={tab==="notifications"?"btn-primary":"btn"}>Notifications</button>
        <button data-testid="settings-tab-security" onClick={()=>handleTabClick("security")} className={tab==="security"?"btn-primary":"btn"}>Security</button>
      </div>
      {isNestedRoute ? (
        <Outlet />
      ) : (
        <>
          {tab==="account" && <AccountSettings />}
          {tab==="workspace" && <WorkspaceSettings />}
          {tab==="organization" && <OrganizationSettings />}
          {tab==="billing" && <BillingPage />}
        </>
      )}
    </div>
  );
}
