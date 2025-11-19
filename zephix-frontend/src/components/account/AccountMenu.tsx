import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";

export function AccountMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const handleSignOut = async () => {
    await logout();
    nav('/login');
  };

  const handleAdminClick = () => {
    setOpen(false);
    nav('/admin');
  };

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        data-testid="avatar-button" 
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50"
        aria-haspopup="menu" 
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
          {(user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
        </div>
        <span className="text-sm font-medium">{user?.name || user?.email || 'User'}</span>
        <svg width="12" height="12" viewBox="0 0 20 20">
          <path d="M5 7l5 5 5-5" stroke="currentColor" fill="none"/>
        </svg>
      </button>

      {open && (
        <div 
          ref={menuRef}
          role="menu" 
          data-testid="menu-account" 
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white shadow-lg"
          onKeyDown={handleKeyDown}
        >
          <button 
            role="menuitem" 
            data-testid="account-item-profile"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            onClick={() => setOpen(false)}
          >
            Profile
          </button>
          
          {user?.role === 'admin' && (
            <button 
              role="menuitem" 
              data-testid="account-item-admin"
              className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              onClick={handleAdminClick}
            >
              Administration
            </button>
          )}
          
          <button 
            role="menuitem" 
            data-testid="account-item-invite"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            onClick={() => setOpen(false)}
          >
            Invite members
          </button>
          
          <button 
            role="menuitem" 
            data-testid="account-item-trash"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            onClick={() => setOpen(false)}
          >
            Trash
          </button>
          
          <button 
            role="menuitem" 
            data-testid="account-item-archive"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            onClick={() => setOpen(false)}
          >
            Archive
          </button>
          
          <button 
            role="menuitem" 
            data-testid="account-item-settings"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            onClick={() => setOpen(false)}
          >
            Settings
          </button>
          
          <div className="border-t my-1" />
          
          <button 
            role="menuitem" 
            data-testid="account-item-signout"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-red-600"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
