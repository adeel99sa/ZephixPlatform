import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface UserMenuProps {
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({ className = '' }) => {
  const { user, logout, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setIsOpen(false);
  };

  const handleProfile = () => {
    navigate('/profile');
    setIsOpen(false);
  };

  const handleSettings = () => {
    navigate('/settings');
    setIsOpen(false);
  };

  const handleAdminHub = () => {
    navigate('/admin');
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <UserCircleIcon className="h-8 w-8 text-gray-600" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="text-xs text-blue-600 font-medium capitalize">
              {user.organizationRole}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleProfile}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <UserCircleIcon className="mr-3 h-4 w-4" />
              My Profile
            </button>
            
            <button
              onClick={handleSettings}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <CogIcon className="mr-3 h-4 w-4" />
              Settings
            </button>

            {/* Admin Section */}
            {isAdmin() && (
              <>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleAdminHub}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
                >
                  <BuildingOfficeIcon className="mr-3 h-4 w-4 text-blue-600" />
                  <span className="text-blue-600">Workspace Admin</span>
                </button>
              </>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
