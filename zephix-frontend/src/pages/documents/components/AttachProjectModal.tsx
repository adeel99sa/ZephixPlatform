import React, { useState } from 'react';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { CheckCircle, X, AlertCircle } from 'lucide-react';
import { ProjectDocument } from '../../../services/documentService';

interface AttachProjectModalProps {
  document: ProjectDocument;
  projectName: string;
  onAttach: (projectId: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const AttachProjectModal: React.FC<AttachProjectModalProps> = ({
  document,
  projectName,
  onAttach,
  onSkip,
  onCancel
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // In a real implementation, you would fetch projects from the API
  const projects = [
    { id: '1', name: projectName },
    { id: '2', name: 'Another Project' },
    { id: '3', name: 'Third Project' }
  ];

  return (
    <Modal isOpen={true} onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Attach Document to Project</h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Document Created Successfully!</h3>
                <p className="text-sm text-blue-700 mt-1">
                  "{document.documentName}" has been created. Would you like to attach it to a project?
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="project-select">Select Project</Label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">
                Attaching to a project will make the document accessible from the project's document tab and enable collaboration features.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onSkip}>
            Skip for Now
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onAttach(selectedProjectId)}
            disabled={!selectedProjectId}
          >
            Attach to Project
          </Button>
        </div>
      </div>
    </Modal>
  );
};


