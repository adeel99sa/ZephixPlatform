import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export const WorkspaceSwitcher: React.FC = () => {
  const { currentWorkspace, availableWorkspaces, loading, loadWorkspaces, switchWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && availableWorkspaces.length === 0) {
      loadWorkspaces();
    }
  }, [user, availableWorkspaces.length, loadWorkspaces]);

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    setIsOpen(false);
    // Refresh the page to load new workspace data
    window.location.reload();
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    navigate('/create-workspace');
  };

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-400">
        Loading workspaces...
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
      >
        <span className="truncate max-w-32">
          {currentWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {/* Current workspace indicator */}
              {currentWorkspace && (
                <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                  Current Workspace
                </div>
              )}
              
              {/* Available workspaces */}
              {availableWorkspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceSwitch(workspace.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                    workspace.id === currentWorkspace?.id 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{workspace.name}</div>
                    {workspace.role === 'owner' && (
                      <div className="text-xs text-indigo-400">Owner</div>
                    )}
                  </div>
                  {workspace.id === currentWorkspace?.id && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 ml-2" />
                  )}
                </button>
              ))}
              
              {/* Separator */}
              <div className="border-t border-gray-700 my-1" />
              
              {/* Create workspace option */}
              <button
                onClick={handleCreateWorkspace}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
