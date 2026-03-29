import { NavLink } from "react-router-dom";

type WorkspaceTabBarProps = {
  workspaceId: string;
};

const tabs = [
  { key: "dashboard", label: "Dashboard", to: "dashboard" },
  { key: "projects", label: "Projects", to: "projects" },
  { key: "resources", label: "Resources", to: "resources" },
  { key: "risks", label: "Risks", to: "risks" },
  { key: "documents", label: "Documents", to: "documents" },
  { key: "settings", label: "Settings", to: "settings" },
];

export function WorkspaceTabBar({ workspaceId }: WorkspaceTabBarProps) {
  return (
    <nav className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/workspaces/${workspaceId}/${tab.to}`}
          className={({ isActive }) =>
            `rounded-md px-3 py-1.5 text-sm ${
              isActive
                ? "bg-blue-50 font-semibold text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

