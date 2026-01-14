/**
 * ROLE MAPPING SUMMARY:
 * - Uses isAdminUser(user) to show/hide Administration menu (consistent with AdminRoute)
 * - isAdminUser checks user.permissions.isAdmin from backend
 * - Navigation uses React Router navigate() to /admin
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrganizationStore } from "@/stores/organizationStore";
import { ChevronDown } from "lucide-react";
import { track } from "@/lib/telemetry";
import { isAdminUser } from "@/types/roles";
import { isPaidUser } from "@/utils/roles";
import { PHASE_5_1_UAT_MODE } from "@/config/phase5_1";

export function UserProfileDropdown() {
  const { user, logout } = useAuth();
  const { currentOrganization, getUserOrganizations, organizations } = useOrganizationStore();
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
    navigate("/login");
  };

  const handleMenuClick = (action: string) => {
    setOpen(false);
    track("user.menu.action", { action });

    switch (action) {
      case "profile":
        navigate("/profile");
        break;
      case "trash":
        navigate("/admin/trash");
        break;
      case "archive":
        // Archive not implemented in MVP - redirect to trash
        navigate("/admin/trash");
        break;
      case "teams":
        // Teams not implemented in MVP - redirect to users
        navigate("/admin/users");
        break;
      case "invite":
        // Invite moved to drawer on Users page
        navigate("/admin/users");
        break;
      case "administration":
        const currentPathBefore = window.location.pathname;
        console.log('[UserProfileDropdown] ⚠️ CLICKED ADMINISTRATION - Starting navigation', {
          email: user?.email,
          permissions: user?.permissions,
          permissionsIsAdmin: user?.permissions?.isAdmin,
          currentPath: currentPathBefore,
          timestamp: new Date().toISOString(),
        });

        // Double-check admin status
        const isAdmin = isAdminUser(user);
        console.log('[UserProfileDropdown] Pre-navigation check - isAdminUser:', isAdmin);

        if (!isAdmin) {
          console.error('[UserProfileDropdown] ❌ BLOCKED - User is not admin!', {
            user,
            permissions: user?.permissions,
          });
          return; // Don't navigate if not admin
        }

        // Use replace: false to allow back button, but log the navigation
        console.log('[UserProfileDropdown] ✅ User is admin, calling navigate("/admin")');
        navigate("/admin", { replace: false });

        // Verify navigation happened after a short delay
        setTimeout(() => {
          const pathAfter = window.location.pathname;
          console.log('[UserProfileDropdown] Post-navigation check (100ms later):', {
            pathBefore: currentPathBefore,
            pathAfter: pathAfter,
            expectedPath: '/admin',
            navigationWorked: pathAfter === '/admin' || pathAfter.startsWith('/admin/'),
            stillOnHome: pathAfter === '/home',
          });
        }, 100);
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-haspopup="true"
        data-testid="user-profile-button"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="font-semibold text-sm truncate">{companyName}</div>
            <div className="text-xs text-gray-500 truncate">Menu</div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
          data-testid="user-profile-menu"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{companyName}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
          </div>

          <div className="py-2">
            <button
              onClick={() => handleMenuClick("profile")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
              data-testid="menu-profile"
            >
              <span className="w-5">👤</span>
              Profile
            </button>

            <button
              onClick={() => handleMenuClick("trash")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
              data-testid="menu-trash"
            >
              <span className="w-5">🗑️</span>
              Trash
            </button>

            <button
              onClick={() => handleMenuClick("archive")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
              data-testid="menu-archive"
            >
              <span className="w-5">🗄️</span>
              Archive
            </button>

            <button
              onClick={() => handleMenuClick("teams")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
              data-testid="menu-teams"
            >
              <span className="w-5">👥</span>
              Teams
            </button>

            <button
              onClick={() => handleMenuClick("invite")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
              data-testid="menu-invite"
            >
              <span className="w-5">➕</span>
              Invite Members
            </button>

            {/* Workspaces - visible to Admin (always, not just during UAT) */}
            {isAdminUser(user) && (
              <button
                onClick={() => navigate("/admin/workspaces")}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                data-testid="menu-workspaces"
              >
                <span className="w-5">🏢</span>
                Workspaces
              </button>
            )}

            {/* Administration - visible to Admin when UAT mode is off, or always if you want both */}
            {isAdminUser(user) && (
              <button
                onClick={() => handleMenuClick("administration")}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                data-testid="menu-administration"
              >
                <span className="w-5">⚙️</span>
                Administration
              </button>
            )}

            {/* Notifications and Security - visible to Admin and Member only */}
            {isPaidUser(user) && (
              <>
                <button
                  onClick={() => navigate("/settings/notifications")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                  data-testid="menu-notifications"
                >
                  <span className="w-5">🔔</span>
                  Notifications
                </button>
                <button
                  onClick={() => navigate("/settings/security")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                  data-testid="menu-security"
                >
                  <span className="w-5">🔒</span>
                  Security
                </button>
              </>
            )}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={() => handleMenuClick("logout")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3"
              data-testid="menu-logout"
            >
              <span className="w-5">➡️</span>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

