import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { FolderPlus, FileText, MoreVertical } from 'lucide-react';
import { folderService, Folder, Project } from '../../services/folderService';
import { CreateProjectModal } from '../projects/CreateProjectModal';

interface FolderTreeProps {
  workspaceId: string;
  onProjectSelect?: (project: Project) => void;
  onFolderSelect?: (folder: Folder) => void;
  selectedProjectId?: string;
  selectedFolderId?: string;
}

interface FolderNode extends Folder {
  children: FolderNode[];
  projects: Project[];
  isExpanded?: boolean;
}

// New Folder Modal
function NewFolderModal({ 
  isOpen, 
  onClose, 
  workspaceId, 
  parentFolderId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  workspaceId: string; 
  parentFolderId?: string; 
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4CAF50');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    try {
      await folderService.createFolder({ 
        workspaceId, 
        parentFolderId, 
        name: name.trim(), 
        color 
      });
      setName('');
      setColor('#4CAF50');
      onClose();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="font-semibold mb-4">Create New Folder</h3>
        <input 
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="w-full border p-2 rounded mb-4"
          autoFocus
        />
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Color:</label>
          <input 
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 border rounded"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}


// Simple draggable project with context menu
function DraggableProject({ 
  project, 
  onSelect, 
  isSelected,
  onRefetch
}: { 
  project: Project; 
  onSelect: (project: Project) => void;
  isSelected: boolean;
  onRefetch: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ 
    id: project.id 
  });
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleRemoveFromFolder = async () => {
    try {
      await folderService.moveProject({ projectId: project.id, folderId: null });
      onRefetch();
    } catch (error) {
      console.error('Error removing project from folder:', error);
      alert('Failed to remove project from folder');
    }
    setShowMenu(false);
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project?')) return;
    
    try {
      // In a real app, you'd call projectService.delete(project.id)
      console.log('Deleting project:', project.id);
      alert('Project deletion not implemented yet - this would call projectService.delete()');
      onRefetch();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
    setShowMenu(false);
  };

  return (
    <div 
      className="flex items-center justify-between group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        ref={setNodeRef} 
        {...attributes} 
        {...listeners}
        className={`
          flex-1 p-2 m-1 border-2 border-red-300 bg-red-50 cursor-grab hover:bg-red-100
          ${isSelected ? 'border-red-500 bg-red-100' : ''}
        `}
        onClick={() => onSelect(project)}
      >
        📄 {project.name}
      </div>

      {/* Menu icon (only on hover) */}
      {isHovered && (
        <div className="relative">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white shadow-lg rounded border z-10 min-w-32">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFromFolder();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
              >
                Remove from Folder
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteProject();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple droppable folder with context menu
function DroppableFolder({ 
  folder, 
  children, 
  onSelect, 
  isSelected,
  onRefetch
}: { 
  folder: FolderNode; 
  children: React.ReactNode;
  onSelect: (folder: Folder) => void;
  isSelected: boolean;
  onRefetch: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: folder.id 
  });
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleRenameFolder = async () => {
    const newName = prompt('Enter new folder name:', folder.name);
    if (!newName || newName.trim() === folder.name) return;
    
    try {
      await folderService.updateFolder(folder.id, { name: newName.trim() });
      onRefetch();
    } catch (error) {
      console.error('Error renaming folder:', error);
      alert('Failed to rename folder');
    }
    setShowMenu(false);
  };

  const handleAddSubfolder = () => {
    // This would open a modal with parentFolderId set to this folder's ID
    console.log('Add subfolder to:', folder.id);
    alert('Subfolder creation not implemented yet - would open modal with parentFolderId');
    setShowMenu(false);
  };

  const handleDeleteFolder = async () => {
    if (!confirm('Delete this folder? Projects will move to workspace root.')) return;
    
    try {
      await folderService.deleteFolder(folder.id);
      onRefetch();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder');
    }
    setShowMenu(false);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`
        p-2 m-1 border-2 border-blue-300 bg-blue-50
        ${isOver ? 'border-green-400 bg-green-100' : ''}
        ${isSelected ? 'border-blue-500 bg-blue-100' : ''}
      `}
      onClick={() => onSelect(folder)}
    >
      <div 
        className="flex items-center justify-between"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div>📁 {folder.name} ({folder.projects?.length || 0})</div>

        {/* Menu icon (only on hover) */}
        {isHovered && (
          <div className="relative">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white shadow-lg rounded border z-10 min-w-32">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRenameFolder();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                >
                  Rename
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddSubfolder();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                >
                  Add Subfolder
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteFolder();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// Workspace root drop zone
function WorkspaceRootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ 
    id: 'workspace-root' 
  });

  return (
    <div 
      ref={setNodeRef}
      className={`
        p-4 m-2 border-2 border-dashed border-gray-400 bg-gray-50 text-center
        ${isOver ? 'border-green-400 bg-green-100' : ''}
      `}
    >
      🏠 Drop projects here to remove from folders
    </div>
  );
}

export function FolderTree({ 
  workspaceId, 
  onProjectSelect, 
  onFolderSelect, 
  selectedProjectId, 
  selectedFolderId 
}: FolderTreeProps) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [unfolderedProjects, setUnfolderedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedFolderIdForProject, setSelectedFolderIdForProject] = useState<string | null>(null);

  // Fetch tree data
  const fetchTree = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await folderService.getFolderTree(workspaceId);
      
      // Process the tree data
      const processedTree = data.map((folder: Folder) => ({
        ...folder,
        children: folder.children || [],
        projects: folder.projects || [],
        isExpanded: false
      }));

      setTree(processedTree);
      
      // Extract unfoldered projects (projects without folderId)
      const allProjects = data.flatMap((folder: Folder) => folder.projects || []);
      const unfoldered = allProjects.filter((project: Project) => !project.folderId);
      setUnfolderedProjects(unfoldered);
      
    } catch (err) {
      console.error('Error fetching folder tree:', err);
      setError('Failed to load folder tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchTree();
    }
  }, [workspaceId]);

  const handleProjectClick = (project: Project) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  const handleCreateProject = (folderId?: string) => {
    setSelectedFolderIdForProject(folderId || null);
    setShowNewProjectModal(true);
  };

  const handleProjectCreated = (project: any) => {
    console.log('Project created:', project);
    fetchTree(); // Refresh the tree
    setShowNewProjectModal(false);
    setSelectedFolderIdForProject(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { active: active.id, over: over?.id });

    if (!over) return;

    const projectId = active.id as string;
    const folderId = over.id === 'workspace-root' ? null : over.id as string;

    try {
      await folderService.moveProject({ projectId, folderId });
      fetchTree(); // Refresh tree after move
    } catch (err) {
      console.error('Error moving project:', err);
    }
  };


  const handleFolderClick = (folder: Folder) => {
    onFolderSelect?.(folder);
  };

  // Render folder node recursively
  const renderFolderNode = (folder: FolderNode) => {
    const isSelected = selectedFolderId === folder.id;

    return (
      <DroppableFolder
        key={folder.id}
        folder={folder}
        onSelect={handleFolderClick}
        isSelected={isSelected}
        onRefetch={fetchTree}
      >
        {/* Render projects in this folder */}
        {folder.projects?.map((project) => (
          <DraggableProject
            key={project.id}
            project={project}
            onSelect={handleProjectClick}
            isSelected={selectedProjectId === project.id}
            onRefetch={fetchTree}
          />
        ))}
        
        {/* Render child folders */}
        {folder.children?.map((child) => renderFolderNode(child))}
      </DroppableFolder>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
        <button 
          onClick={fetchTree} 
          className="mt-2 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold">Folders</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-gray-100 rounded"
            title="Create New Folder"
          >
            <FolderPlus size={16} />
            New Folder
          </button>
          <button 
            onClick={() => handleCreateProject()}
            className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-gray-100 rounded"
            title="Create New Project"
          >
            <FileText size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext onDragEnd={handleDragEnd}>
          {/* Root folders */}
          {tree.map((folder) => renderFolderNode(folder))}
          
          {/* Unfoldered projects */}
          {unfolderedProjects.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Projects (No Folder)</h4>
              {unfolderedProjects.map((project) => (
                <DraggableProject
                  key={project.id}
                  project={project}
                  onSelect={handleProjectClick}
                  isSelected={selectedProjectId === project.id}
                  onRefetch={fetchTree}
                />
              ))}
            </div>
          )}
          
          {/* Workspace root drop zone */}
          <WorkspaceRootDropZone />
        </DndContext>
      </div>

      {/* Modals */}
      <NewFolderModal 
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        workspaceId={workspaceId}
      />
      <CreateProjectModal 
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        workspaceId={workspaceId}
        folderId={selectedFolderIdForProject}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}

export default FolderTree;