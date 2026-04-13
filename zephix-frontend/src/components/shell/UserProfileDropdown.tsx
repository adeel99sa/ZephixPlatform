import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
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
import { InviteMembersDialog } from "@/features/administration/components/InviteMembersDialog";

const HELP_URL = "https://docs.zephix.io";

/** Above admin drawers/backdrops (e.g. TemplateDetailPanel z-40) and app header (z-50). */
const PROFILE_MENU_Z = 200;
const MENU_GAP_PX = 8;
const MENU_MAX_HEIGHT_PX = 420;

type Align = "left" | "right";

export function UserProfileDropdown({ align = "left" }: { align?: Align }) {
  const { user, logout } = useAuth();
  const { currentOrganization, getUserOrganizations, organizations } = useOrganizationStore();
  const { clearActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const platformRole = platformRoleFromUser(user);
  const isAdmin = platformRole === PLATFORM_ROLE.ADMIN;

  useEffect(() => {
    if (user && organizations.length === 0) {
      getUserOrganizations();
    }
  }, [user, organizations.length, getUserOrganizations]);

  const updateMenuPosition = useCallback(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX;
    const openUpward = spaceBelow < MENU_MAX_HEIGHT_PX && rect.top > MENU_MAX_HEIGHT_PX;

    const base: CSSProperties = {
      position: "fixed",
      zIndex: PROFILE_MENU_Z,
      width: "16rem",
      top: undefined,
      bottom: undefined,
      left: undefined,
      right: undefined,
      maxHeight: undefined,
    };

    if (align === "right") {
      base.right = Math.max(MENU_GAP_PX, window.innerWidth - rect.right);
    } else {
      base.left = Math.max(MENU_GAP_PX, rect.left);
    }

    if (openUpward) {
      base.bottom = Math.max(MENU_GAP_PX, window.innerHeight - rect.top + MENU_GAP_PX);
      base.maxHeight = Math.min(MENU_MAX_HEIGHT_PX, rect.top - MENU_GAP_PX * 2);
    } else {
      base.top = rect.bottom + MENU_GAP_PX;
      base.maxHeight = Math.min(MENU_MAX_HEIGHT_PX, spaceBelow);
    }

    setMenuStyle(base);
  }, [open, align]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

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

  // Escape: capture on document so fixed overlays (e.g. template drawer) do not
  // handle Escape first and dismiss the underlying surface while the menu is open.
  useEffect(() => {
    if (!open) return;
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", handleKeyDownCapture, true);
    return () => document.removeEventListener("keydown", handleKeyDownCapture, true);
  }, [open]);

  const handleLogout = async () => {
    track("user.logout", { userId: user?.id });
    await logout();
    clearActiveWorkspace();
    navigate("/login");
  };

  const userInitial = (user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  function go(action: string, path: string) {
    setOpen(false);
    track("user.menu.action", { action });
    navigate(path);
  }

  const menuContent =
    open &&
    createPortal(
      <div
        ref={dropdownRef}
        style={menuStyle}
        className="flex flex-col overflow-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
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

        <div className="min-h-0 shrink-0 py-1">
          <MenuItem
            icon={<User className="h-4 w-4" />}
            label="My Profile"
            onClick={() => go("profile", "/settings")}
            testId="menu-profile"
          />

          <MenuItem
            icon={<Settings className="h-4 w-4" />}
            label="Preferences"
            onClick={() => go("preferences", "/settings")}
            testId="menu-preferences"
          />

          {isAdmin && (
            <MenuItem
              icon={<UserPlus className="h-4 w-4" />}
              label="Invite Members"
              onClick={() => {
                setOpen(false);
                setInviteOpen(true);
                track("user.menu.action", { action: "invite_members" });
              }}
              testId="menu-invite-members"
            />
          )}

          <div className="my-1 border-t border-slate-200" />

          {isAdmin && (
            <MenuItem
              icon={<Shield className="h-4 w-4" />}
              label="Administration Console"
              onClick={() => go("administration", "/administration")}
              testId="menu-administration"
            />
          )}

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
      </div>,
      document.body,
    );

  return (
    <div className="relative" data-testid="user-profile-dropdown">
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

      {menuContent}

      {/* Portal the dialog to document.body so it escapes layout ancestors. */}
      {createPortal(
        <InviteMembersDialog
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />,
        document.body,
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
