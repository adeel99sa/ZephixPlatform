import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useWorkspaceStore } from "@/state/workspace.store";
import {
  User,
  Settings,
  UserPlus,
  Shield,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { track } from "@/lib/telemetry";
import { platformRoleFromUser, PLATFORM_ROLE } from "@/utils/roles";

const HELP_URL = "https://docs.zephix.io";

type Align = "left" | "right";

export function UserProfileDropdown({ align = "left" }: { align?: Align }) {
  const { user, logout } = useAuth();
  const { currentOrganization, getUserOrganizations, organizations } = useOrganizationStore();
  const { clearActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const platformRole = platformRoleFromUser(user);
  const isAdmin = platformRole === PLATFORM_ROLE.ADMIN;

  useEffect(() => {
    if (user && organizations.length === 0) {
      getUserOrganizations();
    }
  }, [user, organizations.length, getUserOrganizations]);

  // Click outside to close
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

  // Escape to close + return focus
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

  const userInitial = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();
  const menuPosition = align === "right" ? "right-0" : "left-0";

  function go(action: string, path: string) {
    setOpen(false);
    track("user.menu.action", { action });
    navigate(path);
  }

  return (
    <div className="relative isolate z-[100]" data-testid="user-profile-dropdown">
      {/* Avatar only — no dropdown arrow per locked spec */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-500 text-sm font-semibold text-white shadow-sm ring-1 ring-blue-200 hover:ring-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Profile menu"
        data-testid="user-profile-button"
      >
        {userInitial}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`absolute ${menuPosition} top-full z-[110] mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5`}
          data-testid="user-profile-menu"
          role="menu"
        >
          {/* Identity header */}
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-500 text-sm font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email ?? "User"}
                </div>
                <div className="truncate text-xs text-slate-500">{user?.email}</div>
              </div>
            </div>
          </div>

          <div className="py-1">
            {/* My Profile */}
            <MenuItem
              icon={<User className="h-4 w-4" />}
              label="My Profile"
              onClick={() => go("profile", "/settings")}
              testId="menu-profile"
            />

            {/* Preferences */}
            <MenuItem
              icon={<Settings className="h-4 w-4" />}
              label="Preferences"
              onClick={() => go("preferences", "/settings")}
              testId="menu-preferences"
            />

            {/* Invite Members — admin only */}
            {isAdmin && (
              <MenuItem
                icon={<UserPlus className="h-4 w-4" />}
                label="Invite Members"
                onClick={() => go("invite_members", "/administration/users")}
                testId="menu-invite-members"
              />
            )}

            {/* Trash and Archive: hidden until real quick-access surfaces exist (carry-forward Pass 2+) */}

            <div className="my-1 border-t border-slate-200" />

            {/* Administration Console — admin only */}
            {isAdmin && (
              <MenuItem
                icon={<Shield className="h-4 w-4" />}
                label="Administration Console"
                onClick={() => go("administration", "/administration")}
                testId="menu-administration"
              />
            )}

            {/* Help — real external link */}
            <a
              href={HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                track("user.menu.action", { action: "help" });
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition"
              data-testid="menu-help"
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
              Help
            </a>

            <div className="my-1 border-t border-slate-200" />

            {/* Log out */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void handleLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition"
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

function MenuItem({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition"
      data-testid={testId}
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}
