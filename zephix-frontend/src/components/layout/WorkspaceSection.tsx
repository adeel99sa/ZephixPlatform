import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, Plus, Settings, Edit, ArrowUpDown, Trash, Archive, FolderPlus, X } from 'lucide-react';
import { CreateWorkspaceModal } from '@/components/Modals/CreateWorkspaceModal';
import { RenameWorkspaceModal } from '@/components/Modals/RenameWorkspaceModal';
import { api } from '@/services/api';

interface Workspace {
  id: string;
  name: string;
  icon?: string;
}

interface WorkspaceSectionProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace) => void;
  onWorkspaceCreated: () => void;
}

export function WorkspaceSection({ 
  workspaces, 
  currentWorkspace, 
  onWorkspaceChange,
  onWorkspaceCreated 
}: WorkspaceSectionProps) {
  const navigate = useNavigate();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number}>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [undoNotification, setUndoNotification] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);

  // Calculate position for create menu portal
  useLayoutEffect(() => {
    if (!showCreateMenu || !btnRef.current) return;
    
    const rect = btnRef.current.getBoundingClientRect();
    const top = rect.bottom + 8; // 8px gap below button
    
    // Keep menu on screen - position from right edge if needed
    const menuWidth = 240;
    const rightEdge = Math.min(window.innerWidth - 16, rect.left + menuWidth);
    const left = Math.max(16, rightEdge - menuWidth);
    
    setMenuPosition({ top, left });
  }, [showCreateMenu]);

  // Handle outside clicks to close create menu
  useEffect(() => {
    if (!showCreateMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const menu = document.querySelector('[role="menu"]');
        if (menu && !menu.contains(e.target as Node)) {
          setShowCreateMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateMenu]);

  const showUndoNotification = (message: string, onUndo: () => void) => {
    setUndoNotification({ message, onUndo });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setUndoNotification(null);
    }, 10000);
  };

  const handleUndo = () => {
    if (undoNotification) {
      undoNotification.onUndo();
      setUndoNotification(null);
    }
  };

  const dismissNotification = () => {
    setUndoNotification(null);
  };

  // Empty state - no workspaces created yet
  if (workspaces.length === 0) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Workspaces
          </span>
        </div>
        
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
          <FolderPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">No workspaces yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Create Workspace
          </button>
        </div>

        <CreateWorkspaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={onWorkspaceCreated}
        />
      </div>
    );
  }

  const handleManageWorkspace = () => {
    setShowWorkspaceMenu(false);
    // Just close menu - manage functionality in workspace settings
    console.log('Manage workspace:', currentWorkspace?.id);
  };

  const handleRenameWorkspace = () => {
    setShowWorkspaceMenu(false);
    setShowRenameModal(true);
  };

  const handleEditWorkspace = () => {
    setShowWorkspaceMenu(false);
    // Edit workspace details
    console.log('Edit workspace:', currentWorkspace?.id);
  };

  const handleSortWorkspace = () => {
    setShowWorkspaceMenu(false);
    // Toggle sort order
    console.log('Sort workspace');
  };

  const handleDeleteWorkspace = async () => {
    setShowWorkspaceMenu(false);
    
    if (!currentWorkspace) return;
    
    // Store workspace data for potential undo
    const workspaceToDelete = { ...currentWorkspace };
    
    try {
      // Delete immediately (Monday.com style)
      await api.delete(`/workspaces/${currentWorkspace.id}`);
      
      // Show undo notification at middle bottom
      showUndoNotification(
        `Workspace "${currentWorkspace.name}" deleted`,
        async () => {
          // Undo action - recreate the workspace
          try {
            await api.post('/workspaces', {
              name: workspaceToDelete.name,
              description: workspaceToDelete.description || ''
            });
            onWorkspaceCreated(); // Refresh workspace list
          } catch (error) {
            console.error('Failed to restore workspace:', error);
          }
        }
      );
      
      onWorkspaceCreated(); // Refresh workspace list
    } catch (error) {
      console.error('Delete failed:', error);
      // TODO: Replace with proper toast notification system
      console.error('Failed to delete workspace:', error);
    }
  };

  const handleViewArchive = () => {
    setShowWorkspaceMenu(false);
    // View archived items
    console.log('View archive');
  };

  return (
    <div className="px-3 py-2">
      {/* Header with menu */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Workspaces
        </span>
        <button
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Workspace menu dropdown */}
      {showWorkspaceMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowWorkspaceMenu(false)}
          />
          <div className="absolute left-48 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={handleManageWorkspace}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage workspace
            </button>
            <button
              onClick={handleRenameWorkspace}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Rename workspace
            </button>
            <button
              onClick={handleEditWorkspace}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit workspace
            </button>
            <button
              onClick={handleSortWorkspace}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort workspace
            </button>
            <button
              onClick={handleDeleteWorkspace}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
            >
              <Trash className="w-4 h-4" />
              Delete workspace
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                setShowWorkspaceMenu(false);
                setShowCreateModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add new workspace
            </button>
            <button
              onClick={() => {
                setShowWorkspaceMenu(false);
                setShowWorkspaceSwitcher(true);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Browse all workspaces
            </button>
            <button
              onClick={handleViewArchive}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              View archive/trash
            </button>
          </div>
        </>
      )}

      {/* Current workspace selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            {currentWorkspace?.name || 'Select workspace'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
        
        <div className="relative">
          <button
            ref={btnRef}
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            type="button"
            aria-label="Create new item"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Workspace switcher dropdown */}
      {showWorkspaceSwitcher && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowWorkspaceSwitcher(false)}
          />
          <div className="absolute left-3 right-3 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-w-[220px]">
            <div className="max-h-64 overflow-y-auto">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => {
                    onWorkspaceChange(workspace);
                    setShowWorkspaceSwitcher(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                    currentWorkspace?.id === workspace.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span>{workspace.name}</span>
                  {currentWorkspace?.id === workspace.id && (
                    <span className="text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={onWorkspaceCreated}
      />

      <RenameWorkspaceModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        workspace={currentWorkspace}
        onSuccess={onWorkspaceCreated}
      />

      {/* Undo Notification - Monday.com style */}
      {undoNotification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 min-w-80 max-w-md flex items-center gap-3 animate-slide-in-from-bottom">
            <div className="flex-1">
              <div className="font-medium text-sm">{undoNotification.message}</div>
            </div>
            <button
              onClick={handleUndo}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Undo
            </button>
            <button
              onClick={dismissNotification}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Menu Portal */}
      {showCreateMenu && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
          className="z-[9999] min-w-[240px] max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 py-1"
          role="menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowCreateMenu(false);
              btnRef.current?.focus();
            }
          }}
        >
          <button
            onClick={() => {
              setShowCreateMenu(false);
              navigate('/templates');
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap transition-colors"
          >
            Create Project
          </button>
          <button
            onClick={() => {
              setShowCreateMenu(false);
              navigate('/create/document');
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap transition-colors"
          >
            Create Document
          </button>
          <button
            onClick={() => {
              setShowCreateMenu(false);
              navigate('/create/form');
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap transition-colors"
          >
            Create Form
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
