import React, { useState } from 'react';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { X, FileText, Info } from 'lucide-react';
import { DocumentTemplate } from '../../../services/documentService';

interface TemplateFormModalProps {
  template: DocumentTemplate;
  onClose: () => void;
  onSubmit: (formData: any) => void;
}

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  template,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    additionalNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Create {template.name}</h2>
              <p className="text-sm text-gray-500">{template.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Template Information</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This template includes {template.fields.sections?.length || 0} sections and will auto-fill project data when attached to a project.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName">Project Name (Optional)</Label>
              <Input
                id="projectName"
                value={formData.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                placeholder="Enter project name for auto-filling..."
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                If provided, the system will try to find and attach this document to the project automatically.
              </p>
            </div>

            <div>
              <Label htmlFor="description">Document Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Add a description for this document..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => handleChange('additionalNotes', e.target.value)}
                placeholder="Any additional notes or context..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Document
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};


