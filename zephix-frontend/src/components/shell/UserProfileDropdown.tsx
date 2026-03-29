import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useWorkspaceStore } from "@/state/workspace.store";
import { Bell, ChevronDown, LogOut, Settings, Shield, User, LockKeyhole } from "lucide-react";
import { track } from "@/lib/telemetry";
import { isAdminUser } from "@/types/roles";

export function UserProfileDropdown() {
  const { user, logout } = useAuth();
  const { currentOrganization, getUserOrganizations, organizations } = useOrganizationStore();
  const { clearActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load organizations if not already loaded
  useEffect(() => {
    if (user && organizations.length === 0) {
      getUserOrganizations();
    }
  }, [user, organizations.length, getUserOrganizations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleLogout = async () => {
    track("user.logout", { userId: user?.id });
    await logout();
    clearActiveWorkspace();
    navigate("/login");
  };

  const handleMenuClick = (action: string) => {
    setOpen(false);
    track("user.menu.action", { action });

    switch (action) {
      case "profile":
        navigate("/profile");
        break;
      case "settings":
        navigate("/settings");
        break;
      case "notifications":
        navigate("/settings/notifications");
        break;
      case "security":
        navigate("/settings/security-sso");
        break;
      case "administration":
        navigate("/administration");
        break;
      case "logout":
        handleLogout();
        break;
    }
  };

  // Get company name from currentOrganization, first organization, or fallback
  const companyName =
    currentOrganization?.name ||
    (organizations.length > 0 ? organizations[0]?.name : null) ||
    "Zephix"; // Fallback to "Zephix" if no org data

  const userInitial = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="relative" data-testid="user-profile-dropdown">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={open}
        aria-haspopup="true"
        data-testid="user-profile-button"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="font-semibold text-sm truncate text-slate-900">{companyName}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          data-testid="user-profile-menu"
        >
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{companyName}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
            </div>
          </div>

          <div className="py-2">
            <button
              onClick={() => handleMenuClick("profile")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
              data-testid="menu-profile"
            >
              <User className="h-4 w-4 text-slate-500" />
              Profile
            </button>

            <button
              onClick={() => handleMenuClick("settings")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
              data-testid="menu-settings"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              Settings
            </button>

            <button
              onClick={() => handleMenuClick("notifications")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
              data-testid="menu-notifications"
            >
              <Bell className="h-4 w-4 text-slate-500" />
              Notifications
            </button>

            <button
              onClick={() => handleMenuClick("security")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
              data-testid="menu-security"
            >
              <LockKeyhole className="h-4 w-4 text-slate-500" />
              Security
            </button>

            <div className="my-1 border-t border-slate-200"></div>
            {isAdminUser(user) && (
              <>
                <button
                  onClick={() => handleMenuClick("administration")}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  data-testid="menu-administration"
                >
                  <Shield className="h-4 w-4 text-slate-500" />
                  Admin Console
                </button>
                <div className="my-1 border-t border-slate-200"></div>
              </>
            )}

            <button
              onClick={() => handleMenuClick("logout")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              data-testid="menu-logout"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


