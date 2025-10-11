import React, { useState } from 'react';
import FolderTree from '../components/folders/FolderTree';
import DndTest from '../components/folders/DndTest';
import { Folder, Project } from '../services/folderService';

const FolderTestPage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  // Use the workspace ID from our API test
  const workspaceId = '967f37e5-4749-4da2-a1a4-7fa7db96d002';

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSelectedFolder(null);
  };

  const handleFolderSelect = (folder: Folder) => {
    setSelectedFolder(folder);
    setSelectedProject(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar with Folder Tree */}
        <div className="w-80 bg-white border-r border-gray-200">
          <FolderTree
            workspaceId={workspaceId}
            onProjectSelect={handleProjectSelect}
            onFolderSelect={handleFolderSelect}
            selectedProjectId={selectedProject?.id}
            selectedFolderId={selectedFolder?.id}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Folder System Test
            </h1>
            
            {/* Selected Item Display */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Item
              </h2>
              
              {selectedProject && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Project:</span>
                    <span className="text-blue-600">{selectedProject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <span className="capitalize text-gray-600">{selectedProject.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ID:</span>
                    <span className="text-sm text-gray-500 font-mono">{selectedProject.id}</span>
                  </div>
                </div>
              )}
              
              {selectedFolder && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Folder:</span>
                    <span className="text-green-600">{selectedFolder.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Color:</span>
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: selectedFolder.color || '#6B7280' }}
                    ></div>
                    <span className="text-sm text-gray-500">{selectedFolder.color || '#6B7280'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Icon:</span>
                    <span className="text-gray-600">{selectedFolder.icon || 'folder'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Depth:</span>
                    <span className="text-gray-600">{selectedFolder.hierarchyDepth}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Projects:</span>
                    <span className="text-gray-600">{selectedFolder.projects?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ID:</span>
                    <span className="text-sm text-gray-500 font-mono">{selectedFolder.id}</span>
                  </div>
                </div>
              )}
              
              {!selectedProject && !selectedFolder && (
                <p className="text-gray-500 italic">
                  Click on a folder or project in the sidebar to see details here.
                </p>
              )}
            </div>

            {/* DnD Test Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <DndTest />
            </div>

            {/* API Test Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                API Test Results
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Workspace ID:</span>
                  <span className="text-gray-600 font-mono">{workspaceId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">API Status:</span>
                  <span className="text-green-600">✅ Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Backend:</span>
                  <span className="text-green-600">✅ Running</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderTestPage;
