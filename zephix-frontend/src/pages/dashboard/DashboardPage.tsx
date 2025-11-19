import { useAuth } from "@/state/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = (user?.role ?? "viewer") as "admin" | "member" | "viewer";

  return (
    <div className="p-4 space-y-4">
      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Kpi id="dash-kpi-1" title={role === "admin" ? "Active Members" : role === "member" ? "Assigned to Me" : "Active Projects"} value="—" />
        <Kpi id="dash-kpi-2" title={role === "admin" ? "Active Projects" : "Due this week"} value="—" />
        <Kpi id="dash-kpi-3" title={role === "admin" ? "At-Risk" : "Mentions"} value="—" />
        <Kpi id="dash-kpi-4" title="Utilization" value="—" />
      </section>

      {/* Lists + Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card id="dash-list-primary" title={role === "admin" ? "Pending Invites" : role === "member" ? "My Tasks" : "Watched Projects"} />
        <Card id="dash-activity" title="Recent Activity" />
        <Card id="dash-snapshot" title="Projects / Workspaces Snapshot" />
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {role === "admin" && (
          <>
            <Action id="dash-action-invite" label="Invite Members" />
            <Action id="dash-action-new-project" label="New Project" />
            <Action id="dash-action-new-workspace" label="New Workspace" />
            <Action id="dash-action-admin" label="Go to Administration" href="/settings" />
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({ id, title, value }: { id: string; title: string; value: string }) {
  return (
    <div data-testid={id} className="border rounded p-3">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Card({ id, title }: { id: string; title: string }) {
  return (
    <div data-testid={id} className="border rounded p-3 min-h-[140px]">
      <div className="font-medium mb-2">{title}</div>
      <div data-testid="empty-state" className="text-sm text-gray-500">Nothing here yet.</div>
    </div>
  );
}

function Action({ id, label, href }: { id: string; label: string; href?: string }) {
  const El: any = href ? "a" : "button";
  return (
    <El data-testid={id} href={href} className="border rounded px-3 py-2 text-sm hover:bg-gray-50 text-left">
      {label}
    </El>
  );
}