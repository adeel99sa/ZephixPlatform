import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  UserPlus, 
  Upload, 
  Trash2, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronDown 
} from 'lucide-react';

export function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: User, label: 'My Profile', href: '/settings/profile' },
    { icon: UserPlus, label: 'Invite Members', href: '/admin/users/invite' },
    { icon: Upload, label: 'Import Data', href: '/admin/import' },
    { icon: Trash2, label: 'Recycle Bin', href: '/admin/trash' },
    { icon: Shield, label: 'Administration', href: '/admin' },
    { icon: HelpCircle, label: 'Get Help', href: '/help' },
  ];

  const handleMenuClick = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="text-xs text-gray-500">{user?.role}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500">{user?.email}</div>
              <div className="text-xs text-gray-400 mt-1">
                {user?.role} • {user?.organizationRole}
              </div>
            </div>

            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleMenuClick(item.href)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="border-t border-gray-100 my-1" />
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}




