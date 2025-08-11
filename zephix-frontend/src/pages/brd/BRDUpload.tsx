import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Download, 
  Eye,
  Clock,
  ArrowRight
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  uploadedAt: Date;
  processingResult?: {
    pages: number;
    extractedSections: string[];
    aiAnalysis: string;
  };
  error?: string;
}

export const BRDUpload: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF and DOCX files are supported';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 50MB';
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processUpload = async (file: File): Promise<void> => {
    const fileId = Date.now().toString();
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
      uploadedAt: new Date()
    };

    setFiles(prev => [...prev, uploadedFile]);

    try {
      // Simulate file upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ));
      }

      // Update to processing status
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'processing', 
          progress: 0 
        } : f
      ));

      // Simulate AI processing
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ));
      }

      // Complete processing with mock results
      const processingResult = {
        pages: Math.floor(Math.random() * 50) + 10,
        extractedSections: [
          'Executive Summary',
          'Project Scope',
          'Functional Requirements',
          'Non-Functional Requirements',
          'User Stories',
          'Acceptance Criteria',
          'Technical Specifications',
          'Timeline & Milestones'
        ],
        aiAnalysis: 'Document successfully analyzed. Key requirements extracted and categorized. Project complexity: Medium. Estimated timeline: 12-16 weeks.'
      };

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          processingResult 
        } : f
      ));

      toast.success(`${file.name} processed successfully!`);
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error',
          error: 'Failed to process document. Please try again.'
        } : f
      ));
      toast.error('Failed to process document');
    }
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    if (isUploading) return;

    setIsUploading(true);
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);
      
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      await processUpload(file);
    }
    
    setIsUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, [isUploading]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return `Uploading... ${file.progress}%`;
      case 'processing':
        return `Processing with AI... ${file.progress}%`;
      case 'completed':
        return 'Processing completed';
      case 'error':
        return file.error || 'Processing failed';
      default:
        return 'Ready';
    }
  };

  const viewProcessingResults = (file: UploadedFile) => {
    if (!file.processingResult) return;
    
    // Navigate to a results view or show modal
    toast.success('Opening processing results...');
    // navigate(`/brd/${file.id}/results`);
  };

  const createProjectFromBRD = (file: UploadedFile) => {
    if (file.status !== 'completed') return;
    
    // Navigate to project creation with BRD data pre-filled
    toast.success('Creating project from BRD...');
    navigate('/projects', { state: { brdFile: file } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <Upload className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Upload Business Requirements Document</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-indigo-400 bg-indigo-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              data-testid="brd-upload-dropzone"
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${
                isDragOver ? 'text-indigo-500' : 'text-gray-400'
              }`} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload your Business Requirements Document
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your BRD file here, or click to browse
              </p>
              <div className="flex items-center justify-center space-x-4">
                <label className="cursor-pointer inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={isUploading}
                    data-testid="brd-file-input"
                  />
                </label>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                <p>Supported formats: PDF, DOCX</p>
                <p>Maximum file size: 50MB</p>
              </div>
            </div>
          </div>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Uploaded Documents ({files.length})
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4" data-testid="uploaded-file-item">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getStatusIcon(file.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1" data-testid={`file-status-${file.id}`}>
                            {getStatusText(file)}
                          </p>
                          {(file.status === 'uploading' || file.status === 'processing') && (
                            <div className="mt-2">
                              <div className="bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${file.progress}%` }}
                                  data-testid="file-upload-progress"
                                />
                              </div>
                            </div>
                          )}
                          {file.status === 'completed' && file.processingResult && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg" data-testid="brd-analysis-results">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <div className="font-medium text-green-800">Pages</div>
                                  <div className="text-green-600">{file.processingResult.pages}</div>
                                </div>
                                <div>
                                  <div className="font-medium text-green-800">Sections Found</div>
                                  <div className="text-green-600">{file.processingResult.extractedSections.length}</div>
                                </div>
                                <div>
                                  <div className="font-medium text-green-800">Status</div>
                                  <div className="text-green-600" data-testid="processing-status">Ready for Project Creation</div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="font-medium text-green-800 text-xs">AI Analysis:</div>
                                <div className="text-green-700 text-xs mt-1">{file.processingResult.aiAnalysis}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.status === 'completed' && (
                          <>
                            <button
                              onClick={() => viewProcessingResults(file)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                              title="View processing results"
                              data-testid="view-results-btn"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => createProjectFromBRD(file)}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200 transition-colors"
                              data-testid="convert-to-project-btn"
                            >
                              <span>Create Project</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove file"
                          data-testid="remove-file-btn"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Information Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">
              What happens when you upload a BRD?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">AI Document Analysis</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Extract key requirements and specifications</li>
                  <li>• Identify project scope and objectives</li>
                  <li>• Parse user stories and acceptance criteria</li>
                  <li>• Analyze technical requirements</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Smart Project Creation</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Auto-generate project structure</li>
                  <li>• Create tasks from requirements</li>
                  <li>• Estimate timeline and resources</li>
                  <li>• Set up project templates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BRDUpload;
