import { useState } from "react";
import { AccountSettings } from "./components/AccountSettings";
import { WorkspaceSettings } from "./components/WorkspaceSettings";
import { OrganizationSettings } from "./components/OrganizationSettings";
import BillingPage from "../billing/BillingPage";

export default function SettingsPage() {
  const [tab, setTab] = useState<"account"|"workspace"|"organization"|"billing">("account");
  return (
    <div data-testid="settings-root" className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex gap-2">
        <button data-testid="settings-tab-account" onClick={()=>setTab("account")} className={tab==="account"?"btn-primary":"btn"}>Account</button>
        <button data-testid="settings-tab-workspace" onClick={()=>setTab("workspace")} className={tab==="workspace"?"btn-primary":"btn"}>Workspace</button>
        <button data-testid="settings-tab-organization" onClick={()=>setTab("organization")} className={tab==="organization"?"btn-primary":"btn"}>Organization</button>
        <button data-testid="settings-tab-billing" onClick={()=>setTab("billing")} className={tab==="billing"?"btn-primary":"btn"}>Billing & Plans</button>
      </div>
      {tab==="account" && <AccountSettings />}
      {tab==="workspace" && <WorkspaceSettings />}
      {tab==="organization" && <OrganizationSettings />}
      {tab==="billing" && <BillingPage />}
    </div>
  );
}
