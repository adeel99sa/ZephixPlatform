import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface UserDropdownProps {
  user: any;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative p-3 border-b border-gray-200" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center space-x-3 hover:bg-gray-100 rounded-md p-2 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-blue-600 text-white rounded-md flex items-center justify-center text-sm font-semibold">
          {getInitials()}
        </div>
        
        {/* Name and Role */}
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-500">{user?.email}</div>
            <div className="text-xs text-gray-400 capitalize mt-1">
              {user?.role} • {user?.organization?.name || 'Organization'}
            </div>
          </div>

          <button
            onClick={() => {
              navigate('/settings/profile');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <span className="mr-3">👤</span>
            My Profile
          </button>

          <button
            onClick={() => {
              navigate('/admin/users/invite');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <span className="mr-3">👥</span>
            Invite Members
          </button>

          <button
            onClick={() => {
              navigate('/admin/import');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <span className="mr-3">📥</span>
            Import Data
          </button>

          <button
            onClick={() => {
              navigate('/admin/trash');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <span className="mr-3">🗑️</span>
            Recycle Bin
          </button>

          <button
            onClick={() => {
              navigate('/admin');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <span className="mr-3">⚙️</span>
            Administration
          </button>

          <div className="h-px bg-gray-200 my-1" />

          <button
            onClick={() => {
              navigate('/help');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <span className="mr-3">❓</span>
            Get Help
          </button>

          <div className="h-px bg-gray-200 my-1" />

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <span className="mr-3">🚪</span>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

