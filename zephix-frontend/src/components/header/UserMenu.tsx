import { useState } from "react";
import { useAuth } from "@/state/AuthContext";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");

  return (
    <div className="relative" data-testid="user-menu">
      <button className="flex items-center gap-2 rounded-full border px-2 py-1"
              data-testid="user-menu-button"
              onClick={() => setOpen(o => !o)}
              aria-haspopup="menu" aria-expanded={open}>
        <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-gray-200 text-sm font-semibold"
              data-testid="user-avatar">{initials || "U"}</span>
        <span className="hidden sm:inline text-sm" data-testid="user-name">
          {user?.firstName} {user?.lastName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white shadow" role="menu"
             onMouseLeave={() => setOpen(false)}>
          <div className="px-3 py-2 text-xs text-gray-500">{user?.email}</div>
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={() => { setOpen(false); nav("/profile"); }}>Profile</button>
          <div className="border-t my-1" />
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                  data-testid="logout"
                  onClick={() => { setOpen(false); logout(); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}