import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentProcessingState } from './AIMappingInterface';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => Promise<void>;
  processingState: DocumentProcessingState;
  onReset: () => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  processingState,
  onReset,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const getStatusMessage = () => {
    switch (processingState.status) {
      case 'uploading':
        return 'Uploading document...';
      case 'processing':
        return `Processing document... ${processingState.progress}%`;
      case 'completed':
        return 'Document processed successfully!';
      case 'failed':
        return 'Processing failed. Please try again.';
      default:
        return 'Drag & drop your document here, or click to browse';
    }
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'uploading':
        return (
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'processing':
        return (
          <div className="relative">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <circle
                className="opacity-75"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="62.83"
                strokeDashoffset={62.83 - (62.83 * processingState.progress) / 100}
                transform="rotate(-90 12 12)"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-blue-600">
              {processingState.progress}%
            </span>
          </div>
        );
      case 'completed':
        return (
          <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
    }
  };

  const isProcessing = processingState.status === 'uploading' || processingState.status === 'processing';

  return (
    <div className="file-upload-zone">
      <div className="max-w-2xl mx-auto">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
            ${isDragActive || dragActive
              ? 'border-blue-400 bg-blue-50'
              : processingState.status === 'completed'
              ? 'border-green-400 bg-green-50'
              : processingState.status === 'failed'
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }
            ${isProcessing ? 'cursor-not-allowed' : ''}
          `}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
        >
          <input {...getInputProps()} disabled={isProcessing} />
          
          {/* Status Icon */}
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>

          {/* Status Message */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {getStatusMessage()}
          </h3>

          {/* Additional Info */}
          {processingState.status === 'idle' && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: .docx, .pdf (max 10MB)
              </p>
              <p className="text-xs text-gray-400">
                Your document will be processed by AI to extract requirements and structure
              </p>
            </>
          )}

          {processingState.status === 'processing' && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                AI is analyzing your document structure...
              </p>
            </div>
          )}

          {processingState.status === 'completed' && (
            <div className="mt-4">
              <p className="text-sm text-green-600">
                Ready to review and refine the AI-generated structure
              </p>
            </div>
          )}

          {processingState.status === 'failed' && (
            <div className="mt-4">
              <p className="text-sm text-red-600">
                {processingState.error}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          {processingState.status === 'failed' && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          )}

          {processingState.status === 'completed' && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Process Another Document
            </button>
          )}
        </div>

        {/* Processing Tips */}
        {processingState.status === 'processing' && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              💡 Processing Tips
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Well-structured documents with clear headings process faster</li>
              <li>• Documents under 5MB typically complete in 15-30 seconds</li>
              <li>• You can safely navigate away - processing continues in the background</li>
            </ul>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Your documents are processed securely and are not stored permanently
          </p>
        </div>
      </div>
    </div>
  );
};
