import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useWorkspaceStore } from "@/state/workspace.store";
import {
  ChevronDown,
  User,
  Settings,
  Shield,
  UserPlus,
  HelpCircle,
  LogOut,
  Bell,
  Lock,
} from "lucide-react";
import { track } from "@/lib/telemetry";
import { isPaidUser, platformRoleFromUser, PLATFORM_ROLE } from "@/utils/roles";

/** Aligned with Home / shell help entry points */
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

  const companyName =
    currentOrganization?.name ||
    (organizations.length > 0 ? organizations[0]?.name : null) ||
    "Zephix";

  const userInitial = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  const menuPosition = align === "right" ? "right-0" : "left-0";

  return (
    <div className="relative" data-testid="user-profile-dropdown">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full min-w-[10rem] items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          align === "right" ? "max-w-[14rem]" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        data-testid="user-profile-button"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-semibold">{companyName}</div>
            <div className="truncate text-xs text-gray-500">Menu</div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`absolute ${menuPosition} top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg`}
          data-testid="user-profile-menu"
        >
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{companyName}</div>
                <div className="truncate text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
          </div>

          <div className="py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                track("user.menu.action", { action: "profile" });
                navigate("/settings");
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
              data-testid="menu-profile"
            >
              <User className="h-4 w-4 text-gray-500" />
              My profile
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                track("user.menu.action", { action: "settings" });
                navigate("/settings");
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
              data-testid="menu-settings"
            >
              <Settings className="h-4 w-4 text-gray-500" />
              Settings
            </button>

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    track("user.menu.action", { action: "administration" });
                    navigate("/administration");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                  data-testid="menu-administration"
                >
                  <Shield className="h-4 w-4 text-gray-500" />
                  Administration
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    track("user.menu.action", { action: "invite_members" });
                    navigate("/administration/users");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                  data-testid="menu-invite-members"
                >
                  <UserPlus className="h-4 w-4 text-gray-500" />
                  Invite members
                </button>
              </>
            ) : null}

            <a
              href={HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setOpen(false);
                track("user.menu.action", { action: "help" });
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
              data-testid="menu-help"
            >
              <HelpCircle className="h-4 w-4 text-gray-500" />
              Help
            </a>

            {isPaidUser(user) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings/notifications");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                  data-testid="menu-notifications"
                >
                  <Bell className="h-4 w-4 text-gray-500" />
                  Notifications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings/security");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                  data-testid="menu-security"
                >
                  <Lock className="h-4 w-4 text-gray-500" />
                  Security
                </button>
              </>
            )}

            <div className="my-1 border-t border-gray-200" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void handleLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
