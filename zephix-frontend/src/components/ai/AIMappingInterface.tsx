import React, { useState, useEffect } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { DocumentReviewInterface } from './DocumentReviewInterface';
import { ProjectGenerationConfirmation } from './ProjectGenerationConfirmation';
import { useDocumentProcessing } from '../../hooks/useDocumentProcessing';
import { useProjectGeneration } from '../../hooks/useProjectGeneration';

export type WorkflowStage = 'upload' | 'review' | 'confirm';

export interface DocumentProcessingState {
  jobId: string | null;
  documentId: string | null;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  parsedDocument: any | null;
}

export interface ProjectGenerationState {
  projectId: string | null;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  progress: number;
  error: string | null;
}

export const AIMappingInterface: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('upload');
  const [documentState, setDocumentState] = useState<DocumentProcessingState>({
    jobId: null,
    documentId: null,
    status: 'idle',
    progress: 0,
    error: null,
    parsedDocument: null,
  });

  const [projectState, setProjectState] = useState<ProjectGenerationState>({
    projectId: null,
    status: 'idle',
    progress: 0,
    error: null,
  });

  const { processDocument, checkStatus } = useDocumentProcessing();
  const { generateProject, checkProjectStatus } = useProjectGeneration();

  // Handle file upload and start processing
  const handleFileUpload = async (file: File) => {
    try {
      setDocumentState(prev => ({ ...prev, status: 'uploading', error: null }));
      
      const { jobId, documentId } = await processDocument(file);
      
      setDocumentState(prev => ({
        ...prev,
        jobId,
        documentId,
        status: 'processing',
        progress: 10,
      }));

      // Start polling for status
      pollDocumentStatus(jobId);
    } catch (error) {
      setDocumentState(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      }));
    }
  };

  // Poll document processing status
  const pollDocumentStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await checkStatus(jobId);
        
        if (status.status === 'completed') {
          setDocumentState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
            parsedDocument: status.result?.parsedDocument,
          }));
          
          clearInterval(pollInterval);
          setCurrentStage('review');
        } else if (status.status === 'failed') {
          setDocumentState(prev => ({
            ...prev,
            status: 'failed',
            error: status.error || 'Processing failed',
          }));
          clearInterval(pollInterval);
        } else {
          // Update progress
          setDocumentState(prev => ({
            ...prev,
            progress: status.progress || prev.progress,
          }));
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup interval after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (documentState.status === 'processing') {
        setDocumentState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Processing timeout - please try again',
        }));
      }
    }, 300000);
  };

  // Handle project generation
  const handleProjectGeneration = async (methodology: string, customSettings?: any) => {
    if (!documentState.documentId) return;

    try {
      setProjectState(prev => ({ ...prev, status: 'generating', error: null }));
      
      const { projectId } = await generateProject(documentState.documentId, methodology, customSettings);
      
      setProjectState(prev => ({
        ...prev,
        projectId,
        status: 'generating',
        progress: 10,
      }));

      // Start polling for project generation status
      pollProjectStatus(projectId);
    } catch (error) {
      setProjectState(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Project generation failed',
      }));
    }
  };

  // Poll project generation status
  const pollProjectStatus = async (projectId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await checkProjectStatus(projectId);
        
        if (status.status === 'completed') {
          setProjectState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
          }));
          
          clearInterval(pollInterval);
          setCurrentStage('confirm');
        } else if (status.status === 'failed') {
          setProjectState(prev => ({
            ...prev,
            status: 'failed',
            error: status.error || 'Project generation failed',
          }));
          clearInterval(pollInterval);
        } else {
          // Update progress
          setProjectState(prev => ({
            ...prev,
            progress: status.progress || prev.progress,
          }));
        }
      } catch (error) {
        console.error('Error polling project status:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup interval after 10 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (projectState.status === 'generating') {
        setProjectState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Project generation timeout - please try again',
        }));
      }
    }, 600000);
  };

  // Reset and start over
  const handleReset = () => {
    setCurrentStage('upload');
    setDocumentState({
      jobId: null,
      documentId: null,
      status: 'idle',
      progress: 0,
      error: null,
      parsedDocument: null,
    });
    setProjectState({
      projectId: null,
      status: 'idle',
      progress: 0,
      error: null,
    });
  };

  // Render current stage
  const renderCurrentStage = () => {
    switch (currentStage) {
      case 'upload':
        return (
          <FileUploadZone
            onFileUpload={handleFileUpload}
            processingState={documentState}
            onReset={handleReset}
          />
        );
      
      case 'review':
        return (
          <DocumentReviewInterface
            parsedDocument={documentState.parsedDocument}
            onGenerateProject={handleProjectGeneration}
            onBack={() => setCurrentStage('upload')}
            projectState={projectState}
          />
        );
      
      case 'confirm':
        return (
          <ProjectGenerationConfirmation
            projectId={projectState.projectId}
            onViewProject={() => {
              // Navigate to project dashboard
              window.location.href = `/projects/${projectState.projectId}`;
            }}
            onStartNew={() => handleReset()}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="ai-mapping-interface">
      <div className="interface-header">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI-Powered BRD Import
        </h1>
        <p className="text-gray-600">
          Upload your Business Requirements Document and let AI transform it into a structured, actionable plan
        </p>
        
        {/* Progress Indicator */}
        {currentStage !== 'upload' && (
          <div className="workflow-progress mt-6">
            <div className="flex items-center justify-center space-x-4">
              <div className={`step ${currentStage === 'upload' ? 'completed' : 'current'}`}>
                <div className="step-number">1</div>
                <div className="step-label">Upload</div>
              </div>
              <div className="step-connector" />
              <div className={`step ${currentStage === 'review' ? 'current' : currentStage === 'confirm' ? 'completed' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">Review</div>
              </div>
              <div className="step-connector" />
              <div className={`step ${currentStage === 'confirm' ? 'current' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-label">Confirm</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="interface-content">
        {renderCurrentStage()}
      </div>

      {/* Error Display */}
      {(documentState.error || projectState.error) && (
        <div className="error-banner mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {documentState.error || projectState.error}
              </h3>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={handleReset}
                className="text-red-400 hover:text-red-600"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
