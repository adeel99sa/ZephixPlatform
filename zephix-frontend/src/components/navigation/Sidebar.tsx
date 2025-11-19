import { NavLink } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <aside data-testid="sidebar" className="w-72 border-r bg-white flex flex-col">
      {/* Profile block */}
      <div data-testid="sidebar-profile" className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
            {(user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div data-testid="sidebar-profile-name" className="font-medium truncate">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown User" : "Unknown User"}
            </div>
            <div data-testid="sidebar-profile-email" className="text-xs text-gray-500 truncate">
              {user?.email ?? ""}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <NavLink data-testid="sidebar-profile-btn-profile" to="/profile" className="text-sm rounded px-2 py-1 hover:bg-gray-50">Profile</NavLink>
          {isAdmin && (
            <>
              <NavLink data-testid="sidebar-profile-btn-admin" to="/settings" className="text-sm rounded px-2 py-1 hover:bg-gray-50">Administration</NavLink>
              <NavLink data-testid="sidebar-profile-btn-invite" to="/members/invite" className="text-sm rounded px-2 py-1 hover:bg-gray-50">Invite Members</NavLink>
            </>
          )}
          <button data-testid="sidebar-profile-btn-signout" onClick={logout} className="text-sm text-red-600 rounded px-2 py-1 hover:bg-gray-50 text-left">
            Sign out
          </button>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="p-2 space-y-1">
        <Item to="/dashboard" testid="nav-dashboard" label="Dashboard" />
        <Item to="/projects"  testid="nav-projects"  label="Projects" />
        <Item to="/workspaces" testid="nav-workspaces" label="Workspaces" />
        <Item to="/templates" testid="nav-templates" label="Templates" />
        <Item to="/resources" testid="nav-resources" label="Resources" />
        <Item to="/analytics" testid="nav-analytics" label="Analytics" />
        {isAdmin && <Item to="/settings" testid="nav-settings" label="Settings" />}
      </nav>
    </aside>
  );
}

function Item({ to, testid, label }: { to: string; testid: string; label: string }) {
  return (
    <NavLink
      to={to}
      data-testid={testid}
      className={({ isActive }) =>
        `block rounded px-3 py-2 text-sm ${isActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`
      }
    >
      {label}
    </NavLink>
  );
}