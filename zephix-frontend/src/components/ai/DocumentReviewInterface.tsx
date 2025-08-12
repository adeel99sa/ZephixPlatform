import React, { useState, useRef, useEffect } from 'react';
import { DocumentViewerPanel } from './DocumentViewerPanel';
import { BRDEditorPanel } from './BRDEditorPanel';
import { ProjectGenerationState } from './AIMappingInterface';

interface DocumentReviewInterfaceProps {
  parsedDocument: any;
  onGenerateProject: (methodology: string, customSettings?: any) => Promise<void>;
  onBack: () => void;
  projectState: ProjectGenerationState;
}

export const DocumentReviewInterface: React.FC<DocumentReviewInterfaceProps> = ({
  parsedDocument,
  onGenerateProject,
  onBack,
  projectState,
}) => {
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [brdData, setBrdData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showMethodologySelector, setShowMethodologySelector] = useState(false);
  
  const documentViewerRef = useRef<HTMLDivElement>(null);
  const brdEditorRef = useRef<HTMLDivElement>(null);

  // Initialize BRD data from parsed document
  useEffect(() => {
    if (parsedDocument) {
      const initialBRD = transformChunksToBRD(parsedDocument.chunks);
      setBrdData(initialBRD);
    }
  }, [parsedDocument]);

  // Transform document chunks into structured BRD format
  const transformChunksToBRD = (chunks: any[]) => {
    const brd: any = {
      metadata: {
        title: '',
        summary: '',
        version: '1.0.0',
        department: '',
        industry: '',
        documentOwner: {
          name: '',
          email: '',
          role: '',
        },
      },
      businessContext: {
        problemStatement: '',
        businessObjective: '',
        successCriteria: [],
      },
      stakeholders: [],
      scope: {
        inScope: [],
        outOfScope: [],
        assumptions: [],
        constraints: [],
      },
      functionalRequirements: [],
      nonFunctionalRequirements: [],
      timeline: {
        phases: [],
        milestones: [],
      },
      riskAssessment: [],
      approvals: [],
    };

    // Map chunks to BRD sections based on content analysis
    chunks.forEach((chunk, index) => {
      const content = chunk.content.toLowerCase();
      const type = chunk.type;
      const metadata = chunk.metadata;

      // Extract title from first heading
      if (type === 'heading' && index === 0) {
        brd.metadata.title = chunk.content;
      }

      // Extract problem statement and objectives
      if (content.includes('problem') || content.includes('issue') || content.includes('challenge')) {
        brd.businessContext.problemStatement = chunk.content;
      }

      if (content.includes('objective') || content.includes('goal') || content.includes('aim')) {
        brd.businessContext.businessObjective = chunk.content;
      }

      // Extract functional requirements
      if (content.includes('requirement') || content.includes('feature') || content.includes('functionality')) {
        brd.functionalRequirements.push({
          id: `FR-${String(brd.functionalRequirements.length + 1).padStart(3, '0')}`,
          title: extractRequirementTitle(chunk.content),
          description: chunk.content,
          priority: determinePriority(chunk.content),
          category: determineCategory(chunk.content),
          acceptanceCriteria: [],
          sourceChunkId: chunk.id || `chunk-${index}`,
        });
      }

      // Extract scope information
      if (content.includes('scope') || content.includes('in scope') || content.includes('out of scope')) {
        if (content.includes('in scope') || content.includes('include')) {
          brd.scope.inScope.push(chunk.content);
        } else if (content.includes('out of scope') || content.includes('exclude')) {
          brd.scope.outOfScope.push(chunk.content);
        }
      }

      // Extract assumptions and constraints
      if (content.includes('assumption') || content.includes('assume')) {
        brd.scope.assumptions.push(chunk.content);
      }

      if (content.includes('constraint') || content.includes('limitation')) {
        brd.scope.constraints.push(chunk.content);
      }
    });

    return brd;
  };

  const extractRequirementTitle = (content: string): string => {
    // Extract a concise title from the requirement content
    const sentences = content.split(/[.!?]/);
    const firstSentence = sentences[0].trim();
    return firstSentence.length > 60 ? firstSentence.substring(0, 60) + '...' : firstSentence;
  };

  const determinePriority = (content: string): 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have' => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('must') || lowerContent.includes('critical') || lowerContent.includes('essential')) {
      return 'Must Have';
    } else if (lowerContent.includes('should') || lowerContent.includes('important')) {
      return 'Should Have';
    } else if (lowerContent.includes('could') || lowerContent.includes('nice to have')) {
      return 'Could Have';
    } else {
      return 'Won\'t Have';
    }
  };

  const determineCategory = (content: string): string => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('user') || lowerContent.includes('authentication') || lowerContent.includes('login')) {
      return 'User Management';
    } else if (lowerContent.includes('data') || lowerContent.includes('database') || lowerContent.includes('storage')) {
      return 'Data Management';
    } else if (lowerContent.includes('report') || lowerContent.includes('analytics') || lowerContent.includes('dashboard')) {
      return 'Reporting & Analytics';
    } else if (lowerContent.includes('integration') || lowerContent.includes('api') || lowerContent.includes('third-party')) {
      return 'Integrations';
    } else {
      return 'General';
    }
  };

  // Handle chunk selection for highlighting
  const handleChunkSelect = (chunkId: string) => {
    setSelectedChunkId(chunkId);
    
    // Scroll to the corresponding chunk in the document viewer
    if (documentViewerRef.current) {
      const chunkElement = documentViewerRef.current.querySelector(`[data-chunk-id="${chunkId}"]`);
      if (chunkElement) {
        chunkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle BRD data updates
  const handleBRDUpdate = (updatedBRD: any) => {
    setBrdData(updatedBRD);
  };

  // Handle project generation
  const handleGenerateProject = async (methodology: string, customSettings?: any) => {
    setShowMethodologySelector(false);
    await onGenerateProject(methodology, customSettings);
  };

  if (!parsedDocument || !brdData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-review-interface">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Review & Refine AI-Generated Structure
          </h2>
          <p className="text-gray-600">
            Review the AI's interpretation and make any necessary adjustments before generating your project plan
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-md transition-colors ${
              isEditing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {isEditing ? 'Preview Mode' : 'Edit Mode'}
          </button>
          
          <button
            onClick={() => setShowMethodologySelector(true)}
            disabled={projectState.status === 'generating'}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {projectState.status === 'generating' ? 'Generating...' : 'Generate Project Plan'}
          </button>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
        {/* Left Panel - Document Viewer */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">
              📄 Original Document
            </h3>
            <p className="text-sm text-gray-600">
              {parsedDocument.filename} • {parsedDocument.chunks.length} sections
            </p>
          </div>
          
          <div 
            ref={documentViewerRef}
            className="p-4 h-full overflow-y-auto"
          >
            <DocumentViewerPanel
              chunks={parsedDocument.chunks}
              selectedChunkId={selectedChunkId}
              onChunkSelect={handleChunkSelect}
            />
          </div>
        </div>

        {/* Right Panel - BRD Editor */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">
              🧱 Structured BRD (Lego Blocks)
            </h3>
            <p className="text-sm text-gray-600">
              AI-generated structure - click to edit and refine
            </p>
          </div>
          
          <div 
            ref={brdEditorRef}
            className="p-4 h-full overflow-y-auto"
          >
            <BRDEditorPanel
              brdData={brdData}
              isEditing={isEditing}
              onUpdate={handleBRDUpdate}
              onChunkSelect={handleChunkSelect}
              selectedChunkId={selectedChunkId}
            />
          </div>
        </div>
      </div>

      {/* Methodology Selector Modal */}
      {showMethodologySelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Select Project Methodology
            </h3>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="methodology"
                  value="agile"
                  defaultChecked
                  className="mr-3"
                />
                <span className="text-sm font-medium">Agile (Scrum/Kanban)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="methodology"
                  value="waterfall"
                  className="mr-3"
                />
                <span className="text-sm font-medium">Waterfall</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="methodology"
                  value="hybrid"
                  className="mr-3"
                />
                <span className="text-sm font-medium">Hybrid</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="methodology"
                  value="custom"
                  className="mr-3"
                />
                <span className="text-sm font-medium">Custom</span>
              </label>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMethodologySelector(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  const selectedMethodology = document.querySelector('input[name="methodology"]:checked')?.value || 'agile';
                  handleGenerateProject(selectedMethodology);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Generate Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Generation Progress */}
      {projectState.status === 'generating' && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-5 w-5 text-blue-500"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Generating Project Plan</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${projectState.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
