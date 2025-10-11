import { Home, Inbox, CheckSquare, Star } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { WorkspaceSection } from './WorkspaceSection';
import { ProfileMenu } from './ProfileMenu';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export function Sidebar() {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await api.get('/workspaces');
      const workspaceList = response.data?.data || response.data || [];
      setWorkspaces(workspaceList);
      
      // Set first workspace as current if none selected
      if (workspaceList.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(workspaceList[0]);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const handleWorkspaceChange = (workspace) => {
    setCurrentWorkspace(workspace);
    // Store in localStorage for persistence
    localStorage.setItem('currentWorkspaceId', workspace.id);
  };

  const handleCreateWorkspace = () => {
    // Navigate to create workspace page or open modal
    window.location.href = '/admin/workspaces/create';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Profile Section */}
      <div className="p-3 border-b border-gray-200">
        <ProfileMenu />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 space-y-1">
          <NavLink
            to="/dashboard/home"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">Home</span>
          </NavLink>

          <NavLink
            to="/dashboard/inbox"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Inbox className="w-5 h-5" />
            <span className="text-sm font-medium">Inbox</span>
          </NavLink>

          <NavLink
            to="/dashboard/my-work"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <CheckSquare className="w-5 h-5" />
            <span className="text-sm font-medium">My Work</span>
          </NavLink>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        {/* Favorites Section */}
        <div className="px-3 py-2">
          <button className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span>Favorites</span>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        {/* Workspace Section */}
        <WorkspaceSection
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={handleWorkspaceChange}
          onCreateWorkspace={handleCreateWorkspace}
        />
      </nav>
    </div>
  );
}


