import React, { useState } from 'react';
import { FileText, Plus, Search, Filter, ChevronRight, Download, Share2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { documentService, DocumentTemplate, ProjectDocument } from '../../services/documentService';
import { TemplateCard } from './components/TemplateCard';
import { DocumentEditor } from './components/DocumentEditor';
import { AttachProjectModal } from './components/AttachProjectModal';
import { TemplateFormModal } from './components/TemplateFormModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

export default function DocumentCenterPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [activeDocument, setActiveDocument] = useState<ProjectDocument | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<ProjectDocument | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', activeCategory],
    queryFn: () => documentService.getTemplates(activeCategory === 'all' ? undefined : activeCategory)
  });

  const createDocumentMutation = useMutation({
    mutationFn: documentService.createFromTemplate,
    onSuccess: (response) => {
      if (response.shouldAttachToProject) {
        setPendingDocument(response.document);
        setShowAttachModal(true);
      } else {
        setActiveDocument(response.document);
        toast.success('Document created successfully');
      }
    },
    onError: (error) => {
      toast.error('Failed to create document');
      console.error('Create document error:', error);
    }
  });

  const attachDocumentMutation = useMutation({
    mutationFn: ({ documentId, projectId }: { documentId: string; projectId: string }) => 
      documentService.attachToProject(documentId, projectId),
    onSuccess: () => {
      toast.success('Document attached to project');
      setShowAttachModal(false);
      setActiveDocument(pendingDocument);
      setPendingDocument(null);
    },
    onError: (error) => {
      toast.error('Failed to attach document to project');
      console.error('Attach document error:', error);
    }
  });

  const handleTemplateSelect = async (template: DocumentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateDocument = async (formData: any) => {
    if (!selectedTemplate) return;
    
    await createDocumentMutation.mutate({
      templateId: selectedTemplate.id,
      projectName: formData.projectName,
      initialContent: formData
    });
  };

  const handleAttachDocument = async (projectId: string) => {
    if (!pendingDocument) return;
    
    await attachDocumentMutation.mutate({
      documentId: pendingDocument.id,
      projectId
    });
  };

  const handleSkipAttachment = () => {
    setShowAttachModal(false);
    setActiveDocument(pendingDocument);
    setPendingDocument(null);
  };

  const handleCancelAttachment = () => {
    setShowAttachModal(false);
    setPendingDocument(null);
  };

  const categories = [
    { id: 'all', name: 'All Templates', icon: FileText },
    { id: 'initiation', name: 'Initiation', icon: FileText },
    { id: 'planning', name: 'Planning', icon: FileText },
    { id: 'execution', name: 'Execution', icon: FileText },
    { id: 'closure', name: 'Closure', icon: FileText }
  ];

  const filteredTemplates = templates?.filter(template => 
    searchTerm === '' || 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (activeDocument) {
    return (
      <DocumentEditor
        document={activeDocument}
        onSave={async (content) => {
          try {
            await documentService.updateDocument(activeDocument.id, content);
            toast.success('Document saved');
          } catch (error) {
            toast.error('Failed to save document');
            console.error('Save document error:', error);
          }
        }}
        onClose={() => setActiveDocument(null)}
      />
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Document Center</h1>
        <p className="text-gray-500 mt-2">
          Create and manage project documents from templates
        </p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              <category.icon className="w-4 h-4" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates
                  .filter(t => category.id === 'all' || t.category === category.id)
                  .map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleTemplateSelect(template)}
                    />
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {selectedTemplate && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSubmit={handleCreateDocument}
        />
      )}

      {showAttachModal && pendingDocument && (
        <AttachProjectModal
          document={pendingDocument}
          projectName={pendingDocument.documentName.split(' - ')[1] || 'Untitled'}
          onAttach={handleAttachDocument}
          onSkip={handleSkipAttachment}
          onCancel={handleCancelAttachment}
        />
      )}
    </div>
  );
}


